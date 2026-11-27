# Star Cineplex — 3D Booking Experience (concept)

Unofficial concept redesign of starcineplex.com — a portfolio case study. **Not affiliated with Star Cineplex.**
The spec is [CLAUDE.md](CLAUDE.md).

## Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000. The full flow is built (Phases 0–9): home → `/book` → seats → checkout → ticket, desktop and mobile.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | TypeScript check |
| `npm run validate:data` | Checks `/data` against the spec (seat counts, labels, bookings, files) |
| `npm run data:showtimes` | Regenerates demo showtimes (`node scripts/generate-showtimes.mjs 2026-11-23`) |
| `npm run media` | Compresses logo, posters and trailers from `/references` into `/public` (`-- --force` to redo) |
| `npm run media:crops` | Measures the black bars baked into each trailer and stores the picture area in `movies.json` |
| `npm run icons` | Rebuilds the verified Solar icon subset (`components/ui/icons.generated.ts`) |
| `npm run models:blender` | Builds the seat / silhouette / door models headless in Blender 5.3 (`tools/blender/*.py`) |
| `npm run models` | Packs + meshopt-compresses them into `/public/models` (one merged mesh per seat type) |

Test pages: `/styleguide` (design tokens) · `/dev/hall` (3D hall engine: halls, camera presets, FPS) · `/dev/capture` (re-render the phone/branch stills).

Demo controls: a mobile number ending in `0000` (or Alt-click on Pay) makes the payment fail; `&hold=20` on the checkout URL shortens the seat hold to 20 seconds.

Icons: Solar by 480 Design (CC BY 4.0). Fonts: Fraunces, Outfit, Anek Bangla, IBM Plex Mono (SIL OFL).
