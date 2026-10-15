# PassFinder for Roblox — Render deployment

## Run locally
1. Install Node.js 20 or newer.
2. Extract this ZIP and open a terminal in the project folder.
3. Run `npm install`.
4. Run `npm run dev` to develop locally (Vite on port 5173, API on port 3000).
5. Open the URL printed by Vite.

## Deploy on Render
### Easiest: GitHub + Blueprint
1. Create a GitHub repository and upload all files from this folder.
2. In Render, choose **New + → Blueprint** and select the repository.
3. Render reads `render.yaml`, installs dependencies, builds the site, and starts the Express server.
4. When deployment completes, open the Render URL.

### Or create a Web Service manually
- Runtime: **Node**
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/_healthcheck`

No environment variables are required for the basic setup.

## Notes
- The Express server proxies requests to Roblox's public endpoints. Roblox can rate-limit requests or change API behavior.
- The app currently discovers passes associated with a creator's own public games. It may not find passes listed by that creator inside a separate donation experience.
- Purchases are not processed by this app. Pass links open on Roblox.
- This is an independent project and is not affiliated with Roblox Corporation.
