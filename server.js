import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "20kb" }));

async function fetchJson(url, init = {}) {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init.headers || {}) }
    });
    if (!response.ok) return { data: null, status: response.status };
    return { data: await response.json(), status: response.status };
  } catch {
    return { data: null, status: 0 };
  }
}

app.get("/api/_healthcheck", (_req, res) => res.json({ message: "Success" }));

app.post("/api/gamepasses", async (req, res) => {
  const username = String(req.body?.username || "").trim().replace(/^@/, "");
  if (!username || username.length > 40) {
    return res.status(400).json({ error: "Enter a valid Roblox username." });
  }

  try {
    const lookup = await fetchJson(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
      }
    );
    if (!lookup.data) {
      return res.status(502).json({ error: "Roblox username search is temporarily unavailable. Please try again." });
    }
    const creator = lookup.data.data?.[0];
    if (!creator) {
      return res.status(404).json({ error: "No Roblox user found with that username. Check the spelling and try again." });
    }
    if (creator.name.toLowerCase() !== username.toLowerCase()) {
      return res.status(502).json({ error: "Roblox returned a different username than requested. Please search again." });
    }

    const gameResult = await fetchJson(
      `https://games.roblox.com/v2/users/${creator.id}/games?accessFilter=Public&sortOrder=Desc&limit=50`
    );
    if (!gameResult.data) {
      return res.status(502).json({ error: "Roblox found the creator, but their public games could not be loaded. Please try again later." });
    }

    const games = gameResult.data.data || [];
    const passes = [];
    let rateLimited = false;
    let failedGames = 0;

    // Sequential requests reduce the chance of triggering Roblox rate limits.
    for (const game of games.slice(0, 20)) {
      let pageToken = "";
      let pages = 0;
      do {
        const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
        const endpoint = `https://apis.roblox.com/game-passes/v1/universes/${game.id}/game-passes?passView=Full&pageSize=100${tokenParam}`;
        const result = await fetchJson(endpoint);
        if (!result.data) {
          failedGames++;
          if (result.status === 429) rateLimited = true;
          break;
        }
        for (const pass of result.data.gamePasses || []) {
          passes.push({
            id: pass.id,
            name: pass.displayName || pass.name || "Untitled gamepass",
            price: pass.price ?? null,
            icon: pass.iconImageAssetId
              ? `https://assetgame.roblox.com/asset-thumbnail/image?assetId=${pass.iconImageAssetId}&width=150&height=150&format=png`
              : null,
            gameName: game.name,
            url: `https://www.roblox.com/game-pass/${pass.id}`
          });
        }
        pageToken = result.data.nextPageToken || "";
        pages++;
      } while (pageToken && pages < 3);
    }

    const avatarResult = await fetchJson(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${creator.id}&size=150x150&format=Png&isCircular=false`
    );
    const unique = [...new Map(passes.map(pass => [pass.id, pass])).values()]
      .sort((a, b) => a.price == null ? 1 : b.price == null ? -1 : a.price - b.price)
      .slice(0, 90);

    const warnings = [];
    if (rateLimited) warnings.push("Roblox rate-limited some requests, so these results may be incomplete. Wait a little and search again.");
    else if (failedGames > 0) warnings.push(`Roblox did not return gamepass data for ${failedGames} game(s), so results may be incomplete.`);
    if (unique.length === 0) warnings.push("This search checks passes associated with the creator’s own public games. Passes listed by this creator inside a donation game may require a separate lookup method and may not appear here.");

    return res.json({
      creator: { ...creator, avatar: avatarResult.data?.data?.[0]?.imageUrl || null },
      passes: unique,
      gamesChecked: Math.min(games.length, 20),
      warnings,
      incomplete: failedGames > 0
    });
  } catch (error) {
    console.error("Gamepass search failed:", error);
    return res.status(500).json({ error: "Unexpected server error while searching Roblox. Please try again." });
  }
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"), err => {
    if (err) res.status(404).send("Build the frontend first by running npm run build.");
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PassFinder running on port ${PORT}`);
});
