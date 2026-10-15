import { useState } from "react";
import {
  Search, ExternalLink, Gamepad2, UserRound, Sparkles,
  ArrowUpRight, LoaderCircle, CircleAlert, RotateCcw
} from "lucide-react";

type Pass = {
  id: number; name: string; price?: number | null; icon?: string | null;
  gameName: string; url: string;
};
type Creator = { id: number; name: string; displayName: string; avatar?: string | null };
type SearchResult = { creator: Creator; passes: Pass[]; gamesChecked: number; warnings: string[] };

function priceTier(price?: number | null) {
  if (price == null) return { symbol: "❔", label: "PRICE UNKNOWN", className: "tier-unknown" };
  if (price === 0) return { symbol: "🆓", label: "FREE", className: "tier-free" };
  if (price <= 49) return { symbol: "🪙", label: "BUDGET", className: "tier-budget" };
  if (price <= 199) return { symbol: "💎", label: "POPULAR", className: "tier-popular" };
  if (price <= 499) return { symbol: "🔥", label: "PREMIUM", className: "tier-premium" };
  if (price <= 999) return { symbol: "👑", label: "ELITE", className: "tier-elite" };
  return { symbol: "💠", label: "ULTRA", className: "tier-ultra" };
}
function formatRobux(price?: number | null) {
  return price == null ? "Price unavailable" : price === 0 ? "Free" : `R$ ${price.toLocaleString()}`;
}

function App() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const clean = username.trim().replace(/^@/, "");
    if (!clean) {
      setError("Enter a Roblox username to get started.");
      setResult(null); setSearched(false); return;
    }
    setLoading(true); setError(""); setResult(null); setSearched(true);
    try {
      const response = await fetch("/api/gamepasses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: clean })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not search Roblox right now. Please try again.");
      setResult(data as SearchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search Roblox right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <a className="brand" href="/" aria-label="PassFinder home">
          <span className="brand-mark"><Gamepad2 size={22} /></span>
          <span>pass<span className="brand-accent">finder</span></span>
        </a>
        <span className="top-note"><span className="live-dot" /> Roblox public catalog</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> THE GAMEPASS DISCOVERY TOOL</div>
        <h1>Find a pass.<br /><span>Make it yours.</span></h1>
        <p className="hero-copy">Search any Roblox creator and explore gamepasses from their public games. When you find one, continue safely on Roblox.</p>
        <form className="search-panel" onSubmit={search}>
          <label htmlFor="username">ROBLOX USERNAME</label>
          <div className="search-row">
            <span className="at-symbol">@</span>
            <input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter a username" autoComplete="off" spellCheck={false} />
            <button type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}
              <span>{loading ? "Searching" : "Find passes"}</span>
            </button>
          </div>
          <div className="search-foot">
            <span><UserRound size={13} /> No Roblox login needed</span>
            <span>Purchases happen on Roblox</span>
          </div>
        </form>
        <div className="hero-stats">
          <div><strong>01</strong><span>Search a creator</span></div><i />
          <div><strong>02</strong><span>Explore their passes</span></div><i />
          <div><strong>03</strong><span>Buy on Roblox</span></div>
        </div>
      </section>

      {error && <section className="notice error-notice" role="alert">
        <CircleAlert size={19} /><div><strong>Search didn’t work</strong><p>{error}</p>
          <button className="text-action" onClick={() => { setError(""); setSearched(false); }}><RotateCcw size={14} /> Dismiss</button>
        </div>
      </section>}

      {loading && <section className="loading-state"><LoaderCircle className="spin" size={26} /><strong>Looking across public Roblox games…</strong><p>This can take a few seconds.</p></section>}

      {!loading && result && <section className="results-section">
        <div className="results-heading"><div><div className="section-kicker">SEARCH RESULTS</div><h2>Creator found</h2></div>
          <span className="result-count">{result.passes.length} {result.passes.length === 1 ? "pass" : "passes"}</span>
        </div>
        <div className="creator-card">
          <div className="avatar-wrap">{result.creator.avatar ? <img src={result.creator.avatar} alt="" /> : <UserRound size={27} />}</div>
          <div className="creator-info"><span className="muted-label">ROBLOX CREATOR</span><h3>{result.creator.displayName}</h3>
            <p>@{result.creator.name} <span>·</span> ID {result.creator.id}</p>
          </div>
          <a className="profile-link" href={`https://www.roblox.com/users/${result.creator.id}/profile`} target="_blank" rel="noreferrer">View profile <ArrowUpRight size={15} /></a>
        </div>
        {result.warnings.length > 0 && <div className="notice warning-notice"><CircleAlert size={17} /><div>{result.warnings.join(" ")}</div></div>}
        {result.passes.length ? <div className="pass-grid">
          {result.passes.map(pass => <article className={`pass-card ${priceTier(pass.price).className}`} key={pass.id}>
            <span className="tier-watermark" aria-hidden="true">{priceTier(pass.price).symbol}</span>
            <div className="pass-art">
              {pass.icon ? <img src={pass.icon} alt="" loading="lazy" /> :
                <div className={`pass-placeholder ${priceTier(pass.price).className}`}>
                  <span className="placeholder-symbol">{priceTier(pass.price).symbol}</span><span className="placeholder-label">{priceTier(pass.price).label}</span>
                </div>}
              <span className="pass-tag">GAMEPASS</span>
            </div>
            <div className="pass-body">
              <div className="game-name">{pass.gameName}</div>
              <div className={`price-tier ${priceTier(pass.price).className}`}><span className="tier-symbol">{priceTier(pass.price).symbol}</span><span>{priceTier(pass.price).label}</span></div>
              <h3>{pass.name}</h3>
              <div className="pass-bottom"><strong>{formatRobux(pass.price)}</strong>
                <a href={pass.url} target="_blank" rel="noreferrer" className="buy-link">View on Roblox <ExternalLink size={14} /></a>
              </div>
            </div>
          </article>)}
        </div> : <div className="empty-state">
          <span className="empty-icon"><Gamepad2 size={26} /></span><h3>No public gamepasses found</h3>
          <p>We checked {result.gamesChecked} public {result.gamesChecked === 1 ? "game" : "games"}. This creator may not have public games or discoverable passes.</p>
          <a href={`https://www.roblox.com/users/${result.creator.id}/profile#!/creations`} target="_blank" rel="noreferrer">Browse their Roblox creations <ArrowUpRight size={15} /></a>
        </div>}
        <p className="results-disclaimer">Prices and availability can change. Always verify the details on Roblox before purchasing.</p>
      </section>}

      {!loading && !result && !error && searched && <section className="empty-state"><h3>No results to show</h3><p>Try searching again with the exact Roblox username.</p></section>}

      <footer><div className="footer-brand"><Gamepad2 size={17} /> passfinder</div>
        <p>Independent discovery tool · Not affiliated with Roblox Corporation.</p>
        <span className="footer-safe"><ExternalLink size={13} /> Checkout stays on roblox.com</span>
      </footer>
    </main>
  );
}
export default App;
