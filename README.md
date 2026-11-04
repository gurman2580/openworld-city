# Openworld City — browser multiplayer prototype

A small original GTA-inspired open-world browser prototype. It includes a procedural 3D city, third-person walking, basic vehicle driving, and experimental real-time player position sync using Cloudflare Durable Objects.

This is a foundation, not a GTA V-scale game. The city is generated from simple geometry and the multiplayer service synchronizes player transforms only. It does not yet include persistent accounts, anti-cheat, vehicle ownership, mission logic, NPC AI, or production-grade server-authoritative physics.

## Requirements

- Node.js 20.19+ or 22.12+
- A Cloudflare account for public multiplayer hosting
- A Cloudflare Pages project
- A modern desktop browser with WebGL

## 1. Install

```bash
npm install
```

## 2. Run the 3D game locally

Terminal 1:

```bash
npm run dev
```

Open the local Vite URL, usually `http://localhost:5173`.

The game works in local free-roam mode even if multiplayer is offline.

## 3. Run the multiplayer worker locally

Terminal 2:

```bash
npm run dev:worker
```

The worker listens at `ws://localhost:8787`. The game connects to `ws://localhost:8787/room/demo` by default. Open two browser tabs and enter the same room to see the other player.

## 4. Deploy the multiplayer worker

Authenticate Wrangler:

```bash
npx wrangler login
```

Deploy:

```bash
npm run deploy:worker
```

Wrangler creates the Durable Object binding and applies the `v1` SQLite-class migration from `wrangler.jsonc`. Copy the deployed Worker URL, for example:

`https://openworld-city-realtime.YOUR_SUBDOMAIN.workers.dev`

Check its health endpoint:

`https://openworld-city-realtime.YOUR_SUBDOMAIN.workers.dev/health`

## 5. Point the game at your deployed Worker

Create a `.env.production` file in the project root:

```bash
VITE_WS_URL=wss://openworld-city-realtime.YOUR_SUBDOMAIN.workers.dev/room/demo
```

Replace `YOUR_SUBDOMAIN` with your actual Cloudflare Workers subdomain. Then build and deploy Pages:

```bash
npm run deploy:pages
```

If you change `.env.production`, rebuild and redeploy Pages.

## 6. Deploy to Cloudflare Pages

The `deploy:pages` command builds the Vite project into `dist` and uploads it to a Pages project named `openworld-city`.

You can also connect the GitHub repository to Cloudflare Pages:
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `VITE_WS_URL` = your `wss://...workers.dev/room/demo` URL

## 7. Embed in Odoo

After Pages is deployed, add an HTML/Embed block to an Odoo page and use:

```html
<iframe
  src="https://YOUR-PAGES-DOMAIN.pages.dev/"
  title="Openworld City"
  width="100%"
  height="720"
  style="width:100%;height: min(85vh, 900px);min-height:600px;border:0;border-radius:12px;overflow:hidden;"
  allow="fullscreen; autoplay"
  allowfullscreen
  loading="lazy">
</iframe>
```

Replace `YOUR-PAGES-DOMAIN.pages.dev` with your real Pages domain. If your Odoo editor strips iframe code, use its Embed/HTML block or ask the Odoo administrator to allow the iframe.

## Controls

- W / A / S / D or arrow keys: move
- Shift: sprint
- Space: jump
- E: enter/exit the nearest car
- Hold left mouse button and drag: rotate the camera

## Important next steps before a public launch

1. Add server-authoritative movement and vehicle physics. This prototype trusts client-reported positions and is only suitable for testing with people you trust.
2. Add room capacity, rate limits, validation, reconnect handling, and moderation tools.
3. Add persistent identity/authentication before saving player progress.
4. Replace procedural placeholder buildings and cars with original optimized 3D assets.
5. Add collision meshes, road navigation, NPC traffic, missions, sound, accessibility and mobile touch controls.
6. Profile performance on target phones and desktops. A large world should be streamed in chunks rather than loaded all at once.

## Original assets and branding

Use original game names, maps, logos, models, sounds, and textures, or assets whose licenses permit use in your project. Do not use Rockstar's GTA assets or branding.
