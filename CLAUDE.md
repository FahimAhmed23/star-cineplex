# Star Cineplex — 3D Booking Experience (Portfolio Concept)

> Read this whole file before every task. It is the source of truth for scope, design and behaviour.
> If something here conflicts with a prompt, ask before changing direction.

---

## 1. Project overview

An **unofficial concept redesign** of the Star Cineplex website (starcineplex.com), Bangladesh's largest
multiplex chain (9 branches). Built as a **portfolio case study** by a product designer.

**The big idea:** booking a seat inside a real-feeling 3D cinema hall — including a "view from your seat"
moment with the trailer playing on the screen — while keeping booking fast and simple.

- Not affiliated with Star Cineplex. Add a small footer note: "Concept redesign — not affiliated with Star Cineplex."
- The footer must include an **About** link (moved out of the navbar, see §7) and the icon credit (§5 Icons).
- Desktop first, then a dedicated mobile pass (see §11).
- No real payments or backend. Data comes from local JSON files.

---

## 2. Product principles (apply to every decision)

1. **Intent first, spectacle second.** Every screen moves the user toward a booking.
2. **3D adds confidence, not friction.** Anything doable in 3D must also be doable quickly in 2D.
3. **Film first.** Most users arrive knowing the movie; the flow starts from the movie, then branch, then time.
4. **Always skippable.** Intros and animations never block the user for more than ~3 seconds.
5. **Real data, real credibility.** Use the real halls, rows, seat classes and prices in `data/`.
6. **Fast on mid-range Android phones.** Performance limits in §10 are requirements, not suggestions.

---

## 3. Scope — the case-study flow

| # | Screen | Status |
|---|--------|--------|
| 1 | **Home**: opening → 3D hall hero + "Tonight at" strip → Now Showing → Coming Soon → Moments → Branches film reel → Footer; plus the Trailer view | Spec'd (§7–8) |
| 2 | **Showtimes**: branch, date, movie → "Choose your experience" (VIP / Premium / Atmos) | Spec'd (§9.2–9.3) |
| 3 | **3D seat selection**: cinema doors → overview → hover popup → view from seat; 2D toggle; best available | Spec'd (§9.4–9.5) |
| 4 | **Checkout & ticket**: 10-min seat hold, phone number, bKash/Nagad/card (mock), QR ticket | Spec'd (§9.6–9.8) |

Out of scope (mention as "future work" only): individual branch pages, a separate Coming Soon page, My tickets, accounts, snacks, loyalty.

---

## 4. Tech stack & structure

- **Next.js (App Router) + TypeScript**
- **React Three Fiber** + **@react-three/drei** for all 3D
- **@react-three/postprocessing** for bloom/glow
- **GSAP + ScrollTrigger** for timelines and scroll (opening sequence, camera moves, hero → section transition,
  pinned film reel, Moments parallax); **Framer Motion** for UI transitions (cards, panels, ticket print)
- **Tailwind CSS** with the design tokens in §5 defined in `tailwind.config` / CSS variables
- Fonts via `next/font/google` (Fraunces with SOFT/WONK/opsz axes, Outfit, Anek Bangla, IBM Plex Mono); self-hosted, `display: swap`
- State: **Zustand** (selected movie, branch, show, seats) — one store shared by the 3D hall, the 2D map and the UI,
  so a seat picked in one place updates everywhere
- Hosting: **Vercel** (free tier) for the portfolio link
- All 3D components are client-only (`'use client'`, loaded with `next/dynamic` and `ssr: false`); the page shell
  and text render first, the canvas streams in after

**Why this stack (don't swap it):** the hall must be built from booking data, with hundreds of clickable seats that
change state and stay in sync with the 2D map and the UI. Spline, Framer/Webflow and Unity/Unreal web exports can't
do that well or load too slowly; plain Three.js would split 3D and UI into two worlds kept in sync by hand.

**3D asset pipeline**
- **The hall is procedural:** seats are placed in code from the grid patterns in `halls.json` (§6); walls, tiers,
  steps, screen and lights are simple geometry coloured from the branch theme (§6). Nothing about the layout is
  modelled by hand, so seat counts are always exact.
- **Modelled assets (Blender → glTF `.glb`):** the 4 seat types (Premium, Semi-Recliner, VIP recliner, Atmos), the
  cinema doors and the 3–4 audience silhouettes. Low-poly (seat ≤ 3k triangles), real-world scale in metres, origin at
  the seat's floor centre, facing −Z (towards the screen).
- Claude Code may build these with **Blender Python scripts** (`/tools/blender/*.py`, run headless) using the
  `references/ai/` renders as the look reference, so the designer doesn't need to model. The designer only reviews.
- Compress every `.glb` with **gltf-transform** (meshopt geometry + KTX2/WebP textures); target ≤ 300KB per seat
  model. Load with drei `useGLTF`, preload on the booking pages.
- Seats render with **InstancedMesh** (one draw call per seat type, §10); booked-seat silhouettes likewise.

```
/app                 routes: / · /book · /book/seats/[showId] · /book/checkout · /book/ticket/[bookingId]
/components
  /nav               Navbar (§7)
  /home              OpeningSequence, HallHero, TrailerCarousel, TonightStrip
  /hall              Hall3D, Seat, Screen, HallLights, CameraRig
  /ui                buttons, chips, badges, dropdowns
/data                halls.json, movies.json, showtimes.json, branches.json
/locales             en.json, bn.json (all UI strings, §5 Language)
/tools/blender       Blender Python scripts that generate the seat/door/silhouette models
/public
  /brand             logo.png (purple + grey, for light backgrounds) and logo-white.png (for dark backgrounds)
  /moments           photos for the glimpse section (§8.8)
  /branches          one photo per branch for the film reel (§8.9)
  /trailers          trailer .mp4 files + poster frames (supplied by the designer)
  /models            compressed .glb models: seats (4 types), doors, silhouettes
/references          design references (images/frames) — see §12
```

---

## 5. Brand & design tokens

### Colours
| Token | Hex | Source / use |
|-------|-----|--------------|
| `--purple` | `#7F3E98` | Star Cineplex brand purple (buttons, highlights, active states) |
| `--purple-light` | `#B784D6` | Added: glows, hover, progress bars on dark |
| `--paper` | `#FAF9F5` | Star Cineplex background (light/transactional screens) |
| `--ink` | `#231F20` | Star Cineplex text colour |
| `--night` | `#07050A` | Added: cinema darkness (hall, opening) |
| `--surface-dark` | `rgba(18,12,24,.72)` + 14px blur | Added: glass panels on dark |
| `--muted` | `#A59CB0` | Added: secondary text on dark |

**3D halls use the real look of each branch** (seat colour, walls, light accents, carpet — see §6 Branch hall
themes). The **UI stays in the Star purple brand** everywhere (popups, chips, buttons, legend, 2D map).

**Seat states must not rely on seat colour** (seats are red, blue, purple, green or tan depending on the branch):
- Selected: a glowing **gold `#F5B72E` outline + lift + small ✓ marker** above the seat (the gold is the only
  non-purple UI accent, reserved for "your seat").
- Hover: brighter glow + lift. Booked: a seated silhouette (§9.5). Seat class: shown by the seat **model shape**
  (regular / semi-recliner / recliner / lounger) and named in the popup.
- **2D map colours** (UI, same for every branch): Premium `#3D2350`, Semi-Recliner `#6A3482`, VIP `#9A5CC0`,
  Booked `#26222B`, Selected `#F5B72E`.

### Theme rule
- **Dark theme** for immersive areas (opening, home hero, Moments, Film Reel, footer, 3D hall, seat selection).
- **Light theme** (`--paper`) for browsing and transactional areas: **Now Showing and Coming Soon** (designer
  decision), checkout, ticket.
- Transition between them with a soft fade, never a hard cut.

### Typography
All fonts are on Google Fonts under the SIL Open Font License (free for commercial use). The look is a free
take on "ITC Avant Garde Gothic + Cooper BT" (both paid, not used).

| Role | Font | Settings | Use for |
|------|------|----------|---------|
| **Display** | **Fraunces** | weight 800 (ExtraBold), `font-variation-settings: 'SOFT' 100, 'WONK' 0, 'opsz' 144`, letter-spacing `-0.025em`, line-height `0.9` | Big moments only: hero movie titles, section titles, the Moments / Film Reel headlines, booking-step titles, ticket movie title, footer headline |
| **UI & body** | **Outfit** | 300–700 (same as starcineplex.com) | Everything functional: navbar, buttons, labels, meta, synopsis, forms, prices, cards' small text |
| **Bangla** | **Anek Bangla** | 600–700 | All Bangla text and the বাংলা toggle |
| **Ticket details** | **IBM Plex Mono** | 400–500 | Seat codes (E7), booking ID, countdown, film-reel edge printing |

**Rules**
- Fraunces **only at 32px and above**. Never for buttons, labels, chips or body text.
- Fraunces in mixed case or lowercase (lowercase is encouraged for warm headlines, e.g. "your seat is waiting.").
  **No all-caps** in Fraunces.
- Outfit for everything users click or read in detail.
- Eyebrow style (Outfit): **sentence case** (no uppercase tracked labels), letter-spacing `0.01em`, 14px, 500 weight,
  `--purple-light`, preceded by a 16px Solar star icon (Bold) in the same colour.

**Type scale**
| Token | Font | Size |
|-------|------|------|
| `display-xl` (hero movie title) | Fraunces **700** (designer: the film title is one step lighter than the other display text) | `clamp(72px, 10vw, 150px)`, also capped by viewport height |
| `display-l` (footer headline) | Fraunces 800 | `clamp(64px, 9vw, 136px)` |
| `display-m` (section titles) | Fraunces 800 | `clamp(44px, 4.6vw, 72px)` |
| `display-s` (booking titles, ticket movie title, hall-type names) | Fraunces 800 | 32–48px |
| `body-l` (synopsis) | Outfit 400 | 16px / 1.55 |
| `body` | Outfit 400 | 15px / 1.5 |
| `ui` (buttons, links) | Outfit 500–600 | 13–15px |
| `caption` | Outfit 400 | 12–13px |
| `mono` | IBM Plex Mono 500 | 12–14px |

### Icons — Solar (by 480 Design)
- **Icon set:** **Solar** only (the same set the designer uses in Figma). Do not mix in other icon libraries.
- **License:** CC BY 4.0 — free for commercial use **with attribution**. Add this credit in the footer's small print:
  "Icons: Solar by 480 Design (CC BY 4.0)".
- **How to load:** `@iconify/react` (`<Icon icon="solar:…" />`) or the MIT-licensed `@solar-icons/react` wrapper.
  **Do not use the `solar-icon-set` npm package** (GPL-3.0).
- **Finding names:** pick each icon on icon-sets.iconify.design → Solar, and **verify the exact name exists**
  before using it. Never guess icon names.

**Styles (only these three):**
| Style | Use for |
|-------|---------|
| **Linear** (default) | All UI: navbar, buttons, inputs, meta info, controls |
| **Bold** | Small filled marks: ★ IMDb rating, ▶ play, active states of toggles |
| **Bold Duotone** (`--purple` + `--purple-light`) | Feature moments: hall-type cards (§9.3), payment method cards (§9.6), ticket confirmation (§9.8) |

**Sizes:** 16px (inline with 13–14px text), 20px (buttons, navbar), 24px (controls), 32–40px (feature cards).
Icons inherit text colour (`currentColor`) unless they are Bold Duotone.

**Icon map (intent → where it's used)** — choose the matching Solar icon for each:
| Area | Intents |
|------|---------|
| Navbar (§7) | phone · map point (Branches) · ticket (My tickets, Buy Tickets) · globe (language) · hamburger menu |
| Hero (§8.2) | play · pause · volume on / volume off · map point ("Playing across 9 branches") · calendar (Full Schedule) · ticket (Buy Tickets) · chevron down (branch dropdown) |
| Movie cards (§8.4–8.6) | star (IMDb rating, Bold) · play (Play Trailer) · calendar (release date) · arrow left/right (Coming Soon slider) |
| Trailer view (§8.7) | arrow left (Back) · volume on/off · restart (Replay) |
| Booking (§9.2–9.5) | calendar · clock · armchair (seat classes, Bold Duotone on hall cards) · sound waves (Atmos card) · eye (View from seat) · 3D cube / map (3D ↔ 2D toggle) · magic stars (Best available) · close · arrow left |
| Checkout & ticket (§9.6–9.8) | phone (mobile field) · wallet / card (payment methods) · stopwatch (seat hold timer) · download (Save ticket) · calendar add (Add to calendar) · route / map arrow (Get directions) · home (Back to home) · check circle (success) · danger triangle (payment failed) |

### Buttons — "centre fill" animation
Based on a Uiverse.io button by **thisSasha** (MIT License; a variation of alexroumi's button). Keep a credit
comment in the button's CSS/component: `/* Hover effect adapted from Uiverse.io by thisSasha (MIT) */`.

**Behaviour:** on hover/focus, a fill layer grows **from the exact centre** of the button (`::before` from 0×0 at
50%/50% to 100%×100%, same border-radius) while the text colour flips. On press, the button scales to **0.94**.
250ms, `--ease-out`. Button has `overflow: hidden`; the fill sits behind the label (`z-index: -1`).

| Variant | Rest | Hover fill | Text on hover | Used for |
|---------|------|-----------|---------------|----------|
| **Primary** | `--purple` bg, white text | `--paper` | `--purple` | Buy Tickets, Play Trailer, Find seats, Continue, Enter hall |
| **Secondary** | transparent, 1px white/50% outline, white text | `--purple` | white | Full Schedule, Show all / Show less, ← Back |
| **Primary (light theme)** | `--purple` bg + 1px `--purple` border, white text | white `#FFFFFF` | `--purple` (text, icon; border stays `--purple`) | Pay ৳…, Save ticket (checkout & ticket pages) |

- Shape: **fully rounded (pill, `--radius-pill`)**; padding 14px 22px (large), 10px 16px (small). Label: Outfit 600, 13–15px,
  sentence case, normal letter-spacing (no uppercase CTAs). Icon (Solar Linear, 18–20px) before the label when relevant.
- Soft shadow at rest: `0 8px 20px -6px rgba(0,0,0,.3)` (on dark: a faint purple glow instead).
- **Keyboard focus** shows the filled (hover) state + a 2px `--purple-light` focus ring (offset 3px).
- **Disabled:** no animation, 40% opacity, `cursor: not-allowed`.
- **Loading** (e.g. Pay): label replaced by a small spinner; button keeps its width.
- **Reduced motion:** the fill fades in (opacity) instead of growing; no press scale.
- **Not used** on chips, icon-only buttons, toggles (3D/2D), showtime chips or seats. Only on real buttons.

### Language — EN / বাংলা
- The toggle **really translates** the key screens: navbar, hero, home section titles, the whole booking flow,
  checkout, ticket, footer. Strings live in `/locales/en.json` and `/locales/bn.json` (no hard-coded UI text).
- Bangla uses **Anek Bangla**; numbers stay in Latin digits for times and prices unless the designer decides otherwise.
- Movie titles show `titleBn` when available, otherwise the English title. Fraunces headlines become Anek Bangla 700 in Bangla.
- The choice is remembered (`localStorage`). **Default: English** — the site always opens in English until the
  user picks বাংলা themselves.

### Radius tokens
- Buttons: **pill** (`--radius-pill`, 9999px).
- Cards scale their radius with their size:
  | Token | Value | Use for |
  |-------|-------|---------|
  | `--radius-card-sm` | 20px | Small cards and tiles: §9.2 poster picks, seat hover popup, small panels |
  | `--radius-card-md` | 24px | Standard cards: `MovieCard` (§8.4), hall-type cards (§9.3), payment cards (§9.6) |
  | `--radius-card-lg` | 32px | Large surfaces: ticket (§9.8), checkout summary card, slide-over panels (Prices, About) |
- Tailwind utilities: `rounded-pill`, `rounded-card-sm`, `rounded-card-md`, `rounded-card-lg`.

### Motion tokens
- `--ease-out`: `cubic-bezier(0.22, 1, 0.36, 1)` — default for UI entering
- `--ease-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)` — camera moves, splits
- Durations: micro 150–200ms · UI 400–700ms · cinematic 1.2–2.5s
- Respect `prefers-reduced-motion`: replace movement with simple fades.

---

## 6. Real data (from starcineplex.com, Nov 2026)

**Branches (9):** Bali Arcade (Chattogram) · Bangladesh Military Museum (Bijoy Shoroni) · Bashundhara City
(Panthapath) · Centrepoint (Uttara) · Finlay Square (Chattogram) · Shimanto Shambhar (Dhanmondi 2) ·
Shimanto Tower (Narayanganj) · SKS Tower (Mohakhali) · Sony Square (Mirpur).

**Seat classes & prices — Bashundhara City (BDT)**
| Class | Weekday matinee | Weekday evening | Weekend/holiday |
|-------|-----|-----|-----|
| Premium (Halls 1–3) | 400 | 550 | 550 |
| Semi-Recliner (Halls 1–3) | 500 | 650 | 650 |
| VIP (Hall 5) | 650 | 850 | 850 |
| Premium (Hall 6 Atmos) | 600 | 750 | 750 |

**Price time bands** (which column of the price table applies to a show):
- **Weekend & holidays:** Friday and Saturday (Bangladesh weekend) + public holidays → weekend price.
- **Weekday matinee:** Sunday–Thursday shows starting **before 5:00 PM**.
- **Weekday evening:** Sunday–Thursday shows starting at **5:00 PM or later**.

**Hall seat maps** (verified against Star Cineplex's own seat-selection screens — see `references/seatmap-*.png`):
- **Row A is nearest the screen**; rows go back from there. **There is no row I** (A–H, then J–N).
- Real halls are **irregular** (missing blocks, rows that fill aisles, different numbering), so halls are **not**
  generated from seat counts. Each hall is stored as an **explicit grid pattern**, and both the 3D hall and the
  2D map are built from it.

`data/halls.json` format:
```json
{
  "id": "bdc-hall-1", "branch": "bashundhara-city", "name": "Hall 1", "type": "premium",
  "numbering": "ltr",          // "ltr" = seat 1 on the left facing the screen, "rtl" = seat 1 on the right
  "pad": 2,                    // zero-pad seat numbers: 2 → "A01", 0 → "A1"
  "rows": [
    { "row": "A", "class": "premium", "pattern": "SSS..SSSSSSSSSSSSS..SSSS", "start": 1 }
  ]
}
```
- `pattern`: one character per grid column, left → right as seen from the audience facing the screen.
  `S` = seat, `.` = empty space (aisle or gap). All rows of a hall have the same length (the hall's grid width).
- Seat labels: walk the `S` columns in the `numbering` direction, numbering from `start`, padded by `pad`.
- 3D: grid column → x position (same pitch for every row); row index → depth + riser height (stadium seating).
  Semi-Recliner and VIP seats use their own larger models but keep the grid positions.

**Branch hall themes** (from real photos in `references/branches/` — see `SOURCES.md` there).
The look is defined **per branch**: every hall of a branch inherits it. Store it in `data/branches.json` as
`theme: { seat, seatMaterial, walls, accentLight, accentStyle, carpet, ref }`. Leather recliner/lounger seats
(VIP and recliner rows) keep their own leather colour where noted.

| Branch | Seats | Walls | Accent lights | Carpet | Reference |
|--------|-------|-------|---------------|--------|-----------|
| **Bashundhara City** | Red fabric `#C0262D`, black armrests (VIP recliners: oxblood leather `#6B1E24`) | Deep navy-violet `#2A2147` | Thin **blue** diagonal light lines `#3D5BFF` (Hall 2/3 variant: magenta LED bars) | Red with gold pattern | `bashundhara-city-1.jpg`, `-2.jpg` |
| **Shimanto Shambhar** | Bright blue fabric `#1F5FD6`, black headrests | Dark charcoal | **Blue zig-zag** wall lights + blue step lights | Dark navy | `shimanto-shambhar.jpg` |
| **SKS Tower** | Orange/tan leather recliners `#D9822B`; blue leather loungers `#2747A8` in the lounger hall | Warm gold panels / blue panels | White light frames (gold hall), blue light lines (blue hall) | Warm patterned / dark blue | `sks-tower-1-recliners.jpg`, `sks-tower-2-loungers.jpg` |
| **Sony Square** | Red fabric `#D42A22` | Black | Small **red hexagon** wall lights | Dark grey | `sony-square.jpg` |
| **Military Museum** | Blue fabric `#2F6FD0`, black arms | Dark grey; white faceted ceiling | Starry blue ceiling panels | Grey with light steps | `military-museum.jpg` |
| **Centrepoint, Uttara** | Lavender/purple `#8E7BE0` (recliner hall: green leather `#7FBF5A`) | Purple triangle-lattice | **Purple** light lines | Dark | `centrepoint-1.jpg`, `centrepoint-2-recliners.jpg` |
| **Bali Arcade** | Lavender/violet `#8E7BE0` (second hall: red `#D93A35`) | Purple triangle-lattice (second hall: charcoal with red/white diagonal stripes) | **Purple** light lines | Dark | `bali-arcade-1.jpg`, `-2.jpg` |
| **Finlay Square** | Red/orange fabric `#E2462A` | Pink + navy geometric panels | Warm downlights | Navy with yellow waves | `finlay-square.jpg` |
| **Shimanto Tower** | Red fabric `#D7262B` | Red | **Red LED** wall columns | Red/grey chevrons | `shimanto-tower-narayanganj.jpg` |

Hex values are approximations sampled from the photos; tune them visually against the references.
**For the build, only Bashundhara City is modelled in detail** (Halls 1–3, 5, 6); other branches use their theme
on the same hall engine.

**Bashundhara Hall 1** (Premium, 248 seats — Halls 2 and 3 use the same layout). `numbering: ltr`, `pad: 2`, grid 24 columns:
| Rows | Class | Pattern | Start | Seats/row |
|------|-------|---------|-------|-----------|
| A, B, C, D | Premium | `SSS..SSSSSSSSSSSSS..SSSS` | 1 | 20 (A01–A20) |
| E | **Semi-Recliner** | `.....SSSSSSSSSSSS...SSS.` | 4 | 15 (E04–E18) |
| F, G, H | Premium | `.....SSSSSSSSSSSSS..SSSS` | 4 | 17 (F04–F20) |
| J, K, L, M | Premium | `SSS..SSSSSSSSSSSSS..SSSS` | 1 | 20 (J01–J20) |
| N (back row) | Premium | `SSSSSSSSSSS..SSSSSSSSSSS` | 1 | 22 (N01–N22) |

**Bashundhara Hall 5 VIP** (113 seats). `numbering: rtl`, `pad: 0`, grid 17 columns:
| Rows | Class | Pattern | Start | Seats/row |
|------|-------|---------|-------|-----------|
| A, B, C | VIP | `.SSSSSSSSSSSS....` | 1 | 12 (A1 on the right … A12) |
| D, E, F, G | VIP | `.SSSSSSSSSSSS..SS` | 1 | 14 |
| H | VIP | `.SSSS....SSSS..SS` | 1 | 10 |
| J (back row) | VIP | `SSSS......SSSSSSS` | 1 | 11 |

**Bashundhara Hall 6 Atmos** (231 seats) — **approximate until the real seat map is supplied.** Known row counts
(front → back): A–F 17 each · G–L 20 each · M 13 · N 16. Until then use Hall 1's style: rows of 17 use the
`.....SSSSSSSSSSSSS..SSSS` pattern (start 4), rows of 20 use the full pattern; M and N: centre the seats in the
24-column grid with one centre gap. Mark this hall as `"approx": true` in the data.

**Movies** go in `data/movies.json`, one object per film:
`slug, title, titleBn, status ("now-showing" | "coming-soon"), imdbRating, certificate ("U" | "A"), runtimeMin,
language, format ("2D" | "3D" | "Atmos"), genres[], synopsis, releaseDate, poster, trailer, featured (bool)`.
IMDb ratings are **placeholders** unless the designer supplies real ones.

---

## 7. Global component — Navbar

**References:** `references/navbar-notch-tab.png` (shape) · `references/navbar-current-starcineplex.png` (current
navbar = the "before"; all its information must be kept).

A **"notch tab" navbar**: a dark, compact bar that hangs from the top edge of the viewport, centred,
like a tab connected to the top of the screen, with small utility items sitting on the top strip on either side.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [phone] 09617660660  ╭────────────────────────────────────────────────────────╮[ticket] My tickets  EN / বাংলা │  ← top strip
│                  │ [logo]  Now Showing  Coming Soon  Showtimes  Prices  Branches  [Buy Tickets]  │  ← notch tab
│                  ╰────────────────────────────────────────────────────────╯                │
```

**Information hierarchy** (every item from the current site is kept; nothing is lost):
| Item | Placement | Why |
|------|-----------|-----|
| Buy Tickets | Tab — primary CTA | The main action |
| Now Showing · Coming Soon · Showtimes · Prices · Branches | Tab — links | Frequent navigation ("Ticket Prices" shortened to "Prices") |
| My tickets | Top strip, right | Returning users only |
| EN / বাংলা | Top strip, far right | Set once |
| Phone 09617660660 | Top strip, left | Rarely needed |
| About | **Footer** (not in the navbar) | Not part of the booking journey |

Note: the current site shows "Branches" twice (utility bar and main nav). Show it **once**, in the tab.

**Shape & style**
- **Top strip:** full-width, ~36px tall, `#0B0810`. Utility items: 12–13px, `--muted`, white on hover, icons 14px.
- **Notch tab:** same colour as the strip, attached to it and hanging below it, centred. Height ~60px,
  bottom corners radius ~14px. Where the tab meets the strip, the sides flare out with **concave (inverted)
  curves** so the tab looks carved from the strip (as in the shape reference).
- Tab contents, left to right:
  - Star Cineplex logo (`/public/brand/logo-white.png` on dark, ~28px tall)
  - Links: 14px, `--muted` → white on hover; ~28px gap between links
  - CTA: white pill button **"Buy Tickets"** with a ticket icon, ink text, 600 weight
- Width: the tab hugs its content (~760px). The strip is always full width.
- Language toggle: `EN / বাংলা` — active language white and underlined, the other `--muted`.
  Bangla labels use Anek Bangla.

**Behaviour**
- Hidden during the opening sequence; the strip and tab slide down from above together
  (`translateY(-100%) → 0`, 600ms, `--ease-out`) right after the split reveal (§8.1 step 4).
- Fixed on scroll. After 80px of scroll the background becomes slightly more opaque and gets a soft shadow.
- Active link: white text + small purple dot under it.
- Below 1100px width: the utilities collapse into the menu (keep only the strip with the tab).

**Mobile:** the strip disappears. The tab shows logo + "Buy Tickets" + a menu icon; the menu holds all links,
My tickets, language toggle and the phone number.

**Navigation map — where every link goes**
| Link / button | Destination |
|---------------|-------------|
| Logo | Home (top) |
| Now Showing · Coming Soon · Branches | **Smooth-scroll** to §8.5 / §8.6 / §8.9 on the home page (from other pages: go home, then scroll) |
| Showtimes · hero "Full Schedule" | `/book` (§9.2) |
| Prices | A **slide-over panel** from the right: the price table for the current branch (branch dropdown at the top), the time-band rules (§6), and a note "Prices from starcineplex.com". Close with ✕ or Escape. |
| My tickets | The **last ticket booked in this browser** (from `localStorage`) opens §9.8; if none: a small panel "No tickets yet" + Buy Tickets button |
| Buy Tickets | `/book` (§9.1) |
| EN / বাংলা | Switches the language (§5 Language) |
| Phone | `tel:09617660660` (also shown as text) |
| Footer: About | A simple About section/panel with the case-study note and credits |

---

## 8. Home page

### 8.1 Opening sequence ("House Lights Down", chosen direction)

**Reference:** `references/opening-projector-beams.png` (two projector beams converging on a centre panel).

Total ≈ 3.2s. Skippable at any time ("Skip intro ›", bottom-right). Plays once per session
(`sessionStorage`); returning visitors go straight to the hero's final state.

| Step | Time | What happens |
|------|------|--------------|
| 1. Darkness | 0–0.3s | Full screen `--night`. Nothing else. |
| 2. Projector beams | 0.3–1.2s | **Two projector light beams** fade/grow in from the **bottom-left and bottom-right corners**, angled up toward the centre (shape exactly like the two wedges in the reference). Beams are soft volumetric light: white→`--purple-light` gradient, ~25–35% opacity, blurred edges, subtle floating dust particles inside the beams. |
| 3. Logo panel | 0.6–1.6s | Where the beams converge, a **centre panel** (the grey rectangle in the reference, ~29% of viewport width, ~2.1:1 ratio) lights up. The **Star Cineplex logo** fades in on it, glowing slightly as if projected. Hold ~0.6s. |
| 4. Split reveal | 1.8–2.6s | The screen **splits horizontally through the middle of the panel**: the **top half slides up** and the **bottom half slides down** (like opening doors), each taking its half of the beams/logo with it. `--ease-in-out`, 800ms. Behind the split, the 3D hall is revealed. |
| 5. Hall arrival | 2.2–3.2s | The 3D hall is shown in an **angled view from the left side of the hall** (camera near the left wall, just above the **last row**, a slightly wider 54° lens): the dark left wall and seats fill the left of the frame, where the hero text sits, and the screen sits on the **right half** with rows of seats in the foreground. (Designer decision; replaces the earlier centred front view — row G was too close.) House lights are already dimmed; the screen brightens from 10% → 100% as the trailer starts. Navbar slides in; hero info (§8.2) fades up with a 100ms stagger. |

Implementation notes:
- Build steps 1–4 as a **2D overlay** (HTML/CSS/SVG or canvas) above the 3D canvas. Only the hall is 3D.
- Start loading the hall and the first trailer **during** steps 1–3, so the reveal never shows a loading state.
  If assets are not ready by step 4, hold on the logo panel (with a subtle pulse) instead of revealing an empty hall.
- The two halves in step 4 can be two clipped copies of the overlay (`clip-path: inset(0 0 50% 0)` and
  `inset(50% 0 0 0)`) animated in opposite directions.
- Reduced motion: skip steps 2–4; fade from black to the hall in 600ms.

### 8.2 Hero — 3D hall with trailer carousel

**Reference:** `references/hero-current-starcineplex.png` (current starcineplex.com hero — keep its content
structure, move it into the 3D hall).

**The scene**
- The 3D hall (Bashundhara Hall 1 from `data/halls.json`) in the **angled left-side view** from §8.1 step 5. The camera
  stays put (very slow idle drift of ±0.3° allowed). Seats in the foreground are dark silhouettes; the screen is the brightest object.
- **The trailer plays on the hall's 3D screen** (video texture from `/public/trailers/*.mp4`), muted by default,
  with a small unmute button. The screen's light spills softly onto the first rows and the walls (colour taken
  from the video's average colour if possible, otherwise a soft white/purple).

**Trailer carousel (like the current site)**
- 5–6 featured movies. Each plays ~15–20s of its trailer, then **auto-advances** to the next.
- Transition between trailers: screen dips to black (300ms), the hero info cross-fades, the next trailer fades in.
- Progress indicator bottom-right: a row of short dashes, the active one fills over the trailer's duration
  in `--purple-light`; click a dash to jump. Pause/play button beside it (pausing stops auto-advance).

**Hero info overlay** (left-aligned, over the dark left wall of the angled view, under **one linear gradient across the whole hero**: dark behind the text column for full contrast, easing to clear just before the screen; no boxed or blurred panel behind the text; the text column always ends before the screen on the right)
- Eyebrow: [star icon] `Now showing at Star Cineplex`
- Movie title (`display-xl`, Fraunces)
- Meta row: `2026 · [A] · 1h 48m · English · [2D]` — rating in an outlined box, format in a purple filled badge
- Synopsis: max 3 lines, then ellipsis
- Buttons: **Buy Tickets** (purple filled, ticket icon) · **Full Schedule** (outlined white, calendar icon)
- Small line: [Solar map-point icon, 16px, `--muted`] "Playing across 9 branches"

**"Tonight at" showtimes strip** (pinned to the bottom of the hero, full width, dark bar)
- Left: [star icon] `Tonight at` label + branch dropdown (default: nearest or last-used branch; demo default Bashundhara City).
- Right: a horizontally scrollable row of **ticket-shaped showtime chips**: `time | movie title | format badge`,
  with a dashed divider between time and title, and **semicircle notches cut out of the left and right edges**
  (like a ticket stub, as in the reference).
- The next upcoming show is highlighted (purple fill); later shows are white chips with ink text.
- Hover: chip lifts 2px. Click: goes straight to seat selection for that show.

---

### 8.3 Scroll transition — hero → Now Showing

**References:** `references/scroll-and-card-hover-reference.webm` (watch 0:02–0:05) ·
`references/scroll-hero-to-section-frames.png` (6 frames of that moment, read left→right, top→bottom).

The hero **stays pinned** while the next section **slides up over it like a sheet**.

- The hero is `position: sticky; top: 0; height: 100vh`. The Now Showing section comes after it with a solid
  `--night` background and a higher z-index, so it covers the hero as the user scrolls.
- Scroll progress `p` = 0 → 1 over the first 100vh of scroll (GSAP ScrollTrigger, `scrub: true`):
  - Hero info (eyebrow, title, meta, synopsis, buttons): opacity 1 → 0 and `translateY 0 → -40px`, finished by `p = 0.5`.
    The synopsis and buttons fade first, then the title (as in the reference frames).
  - "Tonight at" strip: fades out by `p = 0.3`.
  - The 3D hall dims: a black overlay 0 → 60% and the screen brightness 100% → 35%; slight scale 1 → 0.96.
  - The Now Showing section rises from below with its title leading.
- When the hero is fully covered (`p = 1`), **pause the trailer video and the 3D render loop** (performance). Resume when scrolling back.
- Scrolling back up plays everything in reverse.
- Reduced motion: no pinning; the sections scroll normally with a simple fade.

### 8.4 Shared component — `MovieCard`

**References:** `references/card-hover-reference.png` (hover feel: lift, darkened poster, info inside the card) ·
`references/card-hover-info-current-starcineplex.png` (the info to show — currently a popup outside the card on
starcineplex.com; we move it **inside** the card).

Used by both Now Showing (§8.5) and Coming Soon (§8.6).

**Size:** big portrait cards. Desktop: 4 cards per row in a 1280px container, 24px gap → ~302px wide,
poster ratio 2:3 (~450px tall). Corner radius 24px (`--radius-card-md`).

**Default state**
- Full-bleed poster image (the whole card is the picture).
- **Top-left:** IMDb rating pill — `★ 8.2`, star and number in **IMDb yellow `#F5C518`**, on a small dark pill
  (`rgba(0,0,0,.6)`, blur 8px, radius 8px, 13px 600 weight). Coming Soon cards show the release date here instead (§8.6).
- **Bottom:** soft dark gradient (transparent → 75% black over the bottom 35%), movie title in white,
  Outfit 600 20px, max 2 lines.

**Hover state** (desktop) — 300ms, `--ease-out`
- Card scales to 1.04 and lifts (shadow `0 20px 50px rgba(0,0,0,.5)` + faint purple glow).
- Poster darkens: gradient overlay grows to cover the bottom ~70% of the card.
- Info slides up 12px and fades in **inside the card**, staggered by 40ms:
  1. Title (already visible, moves up to make room)
  2. Meta row: certificate box `[U]` (outlined) · `2h 20m` · `Bangla` · format badge `2D` (purple filled)
  3. Genre chips: `Family` `Historical` `Drama` (glass chips, 12px)
  4. **Play trailer** (Solar play icon) — full-width purple button (`--purple`, white text, sentence case)
- The IMDb pill stays visible.
- Clicking the card anywhere **except** the button → that movie's showtimes. Clicking **Play Trailer** → Trailer view (§8.7).

**Touch devices:** no hover. First tap shows the hover state; second tap (or tapping Play Trailer) acts.

### 8.5 Now Showing in Theaters

- Section background **`--paper` (light theme)**, title in `--ink`, "Show all" button as the light secondary (ink outline → purple fill). Container 1280px, padding-top 120px.
- **Header: the title only** — "Now Showing in Theaters", centred, `display-m` (Fraunces). No eyebrow, no pill, no subtitle.
- **Grid of `MovieCard`s, 4 per row.** Initially show **4 cards** (the first row only).
- Below the grid, centred: a **"Show all" button** (pill, outlined white, 14px; inspired by bKash's centred "See all"),
  with the total count, e.g. `Show all (12) ↓`.
  - Click: the grid **expands in place** to reveal all remaining movies (height animates 500ms `--ease-in-out`;
    new cards fade up with a 60ms stagger). The button becomes `Show less ↑`.
  - `Show less` collapses back to 4 cards and scrolls the section title back into view.
  - If there are 4 or fewer movies, hide the button.
- Cards enter on first scroll into view: fade up 24px, 80ms stagger.

### 8.6 Coming Soon

**Same layout and the same `MovieCard` as Now Showing**, with these differences:
- Title: "Coming Soon", centred, same style. **Light theme** like Now Showing: `--paper` background, `--ink` title,
  white slider arrows with a soft shadow, ink dots.
- **Auto-sliding row instead of a grid:** 4 cards visible, the row **slides one card to the left every 3.5s**
  (slide 700ms, `--ease-in-out`), looping infinitely.
  - Pause auto-slide while hovering or focusing a card, and while the section is off-screen. Resume 1s after the mouse leaves.
  - Small arrows (‹ ›) at the sides and dot pagination below for manual control; manual use restarts the 3.5s timer.
- **Top-left pill shows the release date** instead of the IMDb rating (unreleased films usually have no score):
  `[calendar icon] 28 Nov` in the same yellow-on-dark style.
- Hover info: certificate (if known), runtime, language, genres, **▶ Play Trailer**.
- **Card click = Play Trailer:** opens the Trailer view (§8.7). There is **no movie-details page**. In the Trailer
  view for a Coming Soon film, the **Buy Tickets** button is replaced by a non-clickable **"Releasing 28 Nov"** badge.
- No "Show all" button.

### 8.7 Trailer view (from "Play Trailer")

Clicking **Play Trailer** on any card should feel like **going to a new page** that looks like the hero —
then scrolling down brings the user back to the sections.

- **Transition (≈700ms):** the clicked card's poster **expands from its position to fill the whole screen**
  (shared-element / FLIP animation), then cross-fades into the 3D hall front view. Under this cover, the page jumps to the top.
- **The view:** the hero (§8.2) in **single-movie mode**:
  - The hall screen plays **that movie's trailer from the start, with sound on** (the click allows audio; show a mute button).
  - The hero info shows that movie; **Buy Tickets** goes to its showtimes.
  - The carousel dashes are hidden and auto-advance is off (it's locked to this movie).
  - A small **"← Back"** chip at the top-left of the hero returns to the exact scroll position the user came from (reverse transition).
- URL updates to `/?trailer=<movie-slug>` with `history.pushState`, so it's shareable and the browser Back button works like Back.
- **Scrolling down** works exactly like the normal home page: the §8.3 sheet transition, then Now Showing, Coming Soon, …
- When the trailer ends: show "Replay" and "Buy Tickets" on the screen area.

### 8.8 "Moments made at Star Cineplex" (glimpse section)

**References:** `references/glimpse-collage-scroll-reference.webm` (layout + parallax feel only — **ignore the end
where one image expands to full screen; nothing in this section opens or expands**) · photos
`references/FB_IMG_*.jpg` (5 real Star Cineplex premiere photos) · `references/logo.png`.

**Goal:** an emotional, purely visual section that makes people feel connected to Star Cineplex. Nothing is clickable.

**Theme — "the lights go down":** a **dark** section (designer decision). Its background starts as a soft
`--paper` → `--night` gradient over the first ~45vh, so the light Coming Soon section above melts into the dark.

**Pinned centre lockup**
- The section is ~260vh tall. A centre lockup is `position: sticky` in the middle of the viewport for the whole section:
  - Star Cineplex logo (`/public/brand/logo-white.png`, on the dark background), ~200px wide
  - 24px below it, the headline: **"Moments made at Star Cineplex"** — `display-m` (Fraunces), 
    `--paper`, centred, max 2 lines
- The lockup fades + rises in (opacity 0→1, `translateY 20px→0`, 700ms) when the section reaches the viewport
  centre, and fades out as the section leaves.

**Scattered photo collage (parallax)**
- 10 tiles cut from the 5 photos (reusing photos with different crops is intended). Each photo is landscape 3:2,
  so portrait/square tiles use `object-fit: cover` with the focal point given below.
- Tiles are absolutely positioned on a tall track and **move upward at different speeds** while scrolling
  (parallax factor 0.7–1.4 relative to scroll). Slow tiles feel far away; fast tiles feel close.
- **Keep the centre column free:** no tile may overlap `x 34%–66%` of the viewport, so the pinned headline is
  never covered and always readable.
- Each tile fades in and scales `0.96 → 1` (600ms) as it enters the viewport. Corner radius 6px, no borders,
  soft shadow `0 14px 40px rgba(0,0,0,.45)`.
- **No hover effects, no click, no expand.**

Starting layout (desktop; `x` = % of viewport width, `y` = vh from the section top; tune visually after building):

| # | Photo | Crop | Focal point | Width | x | y | Speed |
|---|-------|------|-------------|-------|---|---|-------|
| 1 | `FB_IMG_1795416225897` (cosplay sword fight) | 3:2 | centre | 22vw | 4% | 10vh | 1.0 |
| 2 | `FB_IMG_1795416392477` (Spider-Man + guests) | 4:5 | Spider-Man (60% 70%) | 14vw | 72% | 4vh | 1.3 |
| 3 | `FB_IMG_1795416234879` (crowd at the event) | 3:4 | left group (30% 50%) | 16vw | 80% | 46vh | 0.8 |
| 4 | `FB_IMG_1795416242292` (group on red carpet) | 4:3 | centre | 20vw | 8% | 62vh | 1.2 |
| 5 | `FB_IMG_1795416383172` (full guest lineup) | 16:9 | centre | 24vw | 70% | 92vh | 1.0 |
| 6 | `FB_IMG_1795416225897` | 3:4 | red ninja, left (15% 50%) | 12vw | 2% | 110vh | 1.4 |
| 7 | `FB_IMG_1795416392477` | 1:1 | guest in grey suit (75% 45%) | 13vw | 18% | 140vh | 0.7 |
| 8 | `FB_IMG_1795416234879` | 3:2 | centre | 20vw | 76% | 150vh | 1.2 |
| 9 | `FB_IMG_1795416242292` | 3:4 | the women in the centre (55% 50%) | 14vw | 6% | 175vh | 0.9 |
| 10 | `FB_IMG_1795416383172` | 1:1 | Spider-Man crouching (50% 75%) | 15vw | 74% | 200vh | 1.3 |

- Images: export to WebP, max 1200px wide, lazy-loaded; move them from `references/` to `/public/moments/`.
- Reduced motion: no parallax — tiles sit still in the same layout and simply fade in.
- Mobile: headline pinned near the top; tiles in two loose staggered columns below it with gentle parallax (0.9–1.1).

### 8.9 Branches — "The Film Reel" (showcase section)

**Purpose:** a pure brand showcase of the 9 branches. **No functional goal:** no map, no "near me", no showtimes,
no buttons. It should make people feel "Star Cineplex is everywhere, and it's mine."

**Theme:** dark, continuing straight on from Moments (`--night`).

**Header** (top-left of the pinned area, 1280px container)
- Headline: **"One Star. Nine homes."** — `display-m` (Fraunces), white.
- Sub-line: "Star Cineplex across Bangladesh" — 16px, `--muted`.

**The film strip**
- The section **pins** (sticky, 100vh) while vertical scroll drives a **horizontal film strip** moving right → left
  (GSAP ScrollTrigger, `scrub: 0.6`). Scroll length ≈ the strip's width, so each frame gets roughly one screen of scroll.
- The strip is a full-bleed horizontal band, ~62vh tall, vertically centred below the header:
  - Film base: near-black `#0D0A10` with a faint warm tint.
  - **Sprocket holes** along the top and bottom edges: rounded rectangles ~14×10px every 28px, `--paper` at 85% opacity.
  - **Edge printing** in the margin between the holes and the frames, like real film stock: tiny amber
    (`#E0A43A` at 60%) monospace text, e.g. `STAR CINEPLEX 35MM ▸ 01`, repeating along the strip.
  - **Frames:** 9 branch frames, ~16:9, separated by a thin 16px black gutter.
- **Frame content** (one frame = one branch):
  - The branch photo, full-bleed in the frame (`/public/branches/<slug>.jpg`). Until photos exist: a typographic
    placeholder — `--night` background with a soft purple/amber **light leak** gradient from one corner.
  - Bottom-left overlay on a soft dark gradient: frame number `01` (small, `--purple-light`), the **branch name**
    (`display-s`, Fraunces ~48px), the area/city (16px, `--muted`), and **one short line of copy** (regular, 15px, `--paper` at 80%).
- **Motion while scrolling:**
  - The frame nearest the centre of the viewport is the "active" one: full brightness, scale 1.
    Other frames: brightness 50%, scale 0.96. Interpolate smoothly as frames pass the centre.
  - A frame counter `03 / 09` sits at the bottom-right of the pinned area and ticks as the active frame changes.
  - Very subtle film grain + gentle brightness flicker (±3%) on the strip only. Never on the text.
- After the 9th frame, one final **end frame** with the Star Cineplex logo (white version) centred, then the pin
  releases and the page continues to the footer.

**Frame order and copy** (copy is **placeholder**; the designer will finalise it):
| # | Branch | Area / city | Line (placeholder) |
|---|--------|-------------|--------------------|
| 01 | Bashundhara City | Panthapath, Dhaka | "Where it all began, 2004." (fact: the first Star Cineplex) |
| 02 | Shimanto Shambhar | Dhanmondi 2, Dhaka | TBD |
| 03 | SKS Tower | Mohakhali, Dhaka | TBD |
| 04 | Sony Square | Mirpur, Dhaka | TBD |
| 05 | Bangladesh Military Museum | Bijoy Shoroni, Dhaka | TBD |
| 06 | Centrepoint | Uttara, Dhaka | TBD |
| 07 | Shimanto Tower | Narayanganj | TBD |
| 08 | Bali Arcade | Chattogram | TBD |
| 09 | Finlay Square | Chattogram | TBD |

- Reduced motion: no pinning; the frames sit in a horizontally scrollable strip (native scroll with snap).
- Mobile: no pinning; a native horizontal swipe strip with scroll-snap, one frame ~85vw wide, sprocket holes kept.

### 8.10 Footer — "The best seat in the house"

**Idea:** the page ends the way a film begins: you're sitting in the hall, the Star Cineplex logo is on the
screen, and a seat is waiting for you. Dark theme (`--night`).

**Background image**
- The photoreal hall front view: `references/ai/hall-premium-front.png` → export to `/public/brand/footer-hall.jpg`
  (WebP/AVIF too, ~1600px wide, ≤ 250KB). The screen in this image is blank.
- The **logo is a separate layer** placed over the screen (the original `logo.png`, transparent background, ~56% of the screen width,
  centred on it, 93% opacity, a faint soft glow). Never bake the logo into the photo, so it stays sharp at any size.
  `references/ai/footer-hall-logo-photoreal.png` shows the intended result.
- **Transitional black gradients** so the image melts into the page instead of sitting in a box:
  - Top: `linear-gradient(to bottom, var(--night) 0%, transparent 28%)` — the film reel's dark end frame flows
    straight into the hall with no visible edge.
  - Bottom: `linear-gradient(to top, var(--night) 0%, var(--night) 18%, transparent 55%)` — the seats fade into
    the solid area where the links sit.
  - A light radial vignette on the left/right edges (≈30% black) to calm the blue wall lights behind the text.
- Full width, height ≈ 100vh on desktop; the image is `object-fit: cover`, anchored to the screen (centre top).

**Content (on top of the image, centred, below the screen)**
- Headline (`display-l`, Fraunces 800, `--paper`, capped at `clamp(52px, 6.2vw, 104px)` so each line fits on one row), two lines:
  **"The best seat in the house / is waiting for you."**
  Bangla: **"হলের সেরা আসনটি আপনার অপেক্ষায়।"**
- Line under it (Outfit 18px, `--muted`): "Pick your seat in under a minute."
- **Buy Tickets** button (Primary, centre fill, §5 Buttons) → `/book`.

**Motion (when the footer scrolls into view)**
1. The hall image is dim (brightness 40%); the screen area is dark.
2. Like a projector starting: the screen brightens over ~1s and the **logo fades up** on it (opacity 0 → 0.93,
   scale 0.98 → 1, `--ease-out`). The image brightens to 100% at the same time.
3. The headline reveals line by line (fade + 16px rise, 120ms apart), then the sub-line and button.
4. Small touch: **one seat in the middle rows glows softly in the selected-seat gold `#F5B72E`** for a moment and then
   settles at a gentle glow — "your seat". Done as a soft radial highlight layer positioned over a seat in the image.
- Plays once per page view. Light parallax on scroll: the image moves at 0.85× scroll speed.
- Reduced motion: everything shown in its final state; no parallax.

**Links area (solid `--night`, below the headline, max-width 1200px)**
| Column | Items |
|--------|-------|
| Brand | White logo, one short line: "Movies, made memorable since 2004." |
| Explore | Now Showing, Coming Soon, Showtimes, Prices, Branches (same targets as the navbar, §7) |
| Help | My tickets, **About** (case-study note + credits panel, §7), Contact: the phone number from the navbar strip |
| Follow | Facebook, Instagram, YouTube icons (Solar/brand icons, 24px; links to Star Cineplex's official pages — placeholders until confirmed) |

**Small print (bottom row, 13px, `--muted`, separated by a 1px line at 10% white)**
- Left: "© Star Cineplex. Concept redesign — not affiliated with Star Cineplex."
- Right: "Icons: Solar by 480 Design (CC BY 4.0)" · "Design: Fahim Ahmed" (portfolio credit) · EN/বাংলা toggle repeated.

**Mobile:** image height ≈ 70vh with the same gradients, headline `display-m`, the four columns stack into two
columns, no accordions (Explore + Help side by side, Follow as an icon row), small print stacked and centred.

---

## 9. Booking flow (inner pages)

Spec'd using **Bashundhara City** as the example branch (its halls: Premium Halls 1–3, VIP Hall 5, Atmos Hall 6).
Every other branch works the same way from `data/`.

**Key fact:** a movie at a given time plays in **one specific hall**, so the user never picks a hall on its own:
they pick a **showtime**, and the showtime decides the hall. **Semi-Recliner is a seat class inside the Premium
halls** (row E in Halls 1–3), not a hall type.

**Steps** (a small stepper at the top of every booking screen): `1 Showtime · 2 Seats · 3 Checkout`

### 9.1 Entry points
| From | Lands on | Pre-filled |
|------|----------|-----------|
| Navbar "Buy Tickets" | §9.2 | Branch = last used (demo: Bashundhara City), date = today |
| Hero / Trailer view "Buy Tickets", or a Now Showing card click | §9.2 | + the movie |
| "Tonight at" showtime chip (§8.2) | §9.5 seat selection directly (through the doors, §9.4) | everything |

Routes: `/book` (step 1) · `/book/seats/[showId]` (step 2) · `/book/checkout` (step 3) · `/book/ticket/[bookingId]` (confirmation).

### 9.2 Step 1a — Branch · Date · Movie (`/book`)
Dark theme, one page, top to bottom:
1. **Branch:** horizontal row of 9 pill buttons (Dhaka branches first). Selected: purple fill.
   **Demo scope (designer decision):** only Bashundhara City is bookable for now; the other 8 pills are shown
   disabled with the note "Demo: only Bashundhara City can be booked for now."
2. **Date:** strip of the next 7 days as chips (`Today`, `Tue 24`, `Wed 25` …).
3. **Movie:** a row of small poster cards (2:3, ~140px wide) for the movies showing at that branch on that date.
   Selected: purple outline + slight lift. If the movie was pre-filled, it's already selected and scrolled into view.
- As soon as branch, date and movie are all chosen, **§9.3 slides in below** on the same page (no page change)
  and the page scrolls smoothly to it. Changing any choice above updates §9.3 in place.

### 9.3 Step 1b — "Choose your experience"
Section title: "Choose your experience". Up to **3 large cards side by side, one per hall type showing this movie
on this date** (hide hall types with no shows):

| Card | Halls | Seat classes & prices (BDT, by time band) | 3D seat model |
|------|-------|------------------------------------------|---------------|
| **VIP** | Hall 5 · 113 seats | VIP 650–850 | Wide plush recliner in the hall's own leather colour (Bashundhara: oxblood `#6B1E24`), side table |
| **Premium** | Halls 1–3 · 248 seats each | Premium 400–550 · Semi-Recliner (row E) 500–650 | Classic cinema seat with cup holders; small note "includes a Semi-Recliner row" |
| **Atmos** | Hall 6 · 231 seats | Premium 600–750 | Premium seat with faint glowing sound-wave rings around it (Dolby Atmos) |

Each card, top to bottom:
- **A slowly rotating 3D seat** of that class (turntable, ~8s per rotation, soft studio light, `--night` background).
  On card hover the rotation speeds up slightly and the seat gets a purple rim light.
- Hall type name (`display-s`, Fraunces 36px) + one line of details (halls, seat count, formats: 2D/3D/Atmos).
- Price range (from the table above).
- **Showtime chips** for this movie/date in that hall type: `7:30 PM · Hall 1`, with an availability dot:
  green "Available", amber "Filling fast" (>70% booked), red "Sold out" (chip disabled).
- Clicking a showtime chip → **§9.4 cinema doors**.

Performance: render all 3 turntable seats with **one shared WebGL canvas** (drei `<View>`), not 3 canvases. Low-poly models.

### 9.4 Transition — the cinema doors
Plays between choosing a showtime and the seat selection. Total ≈ 1.8s.

1. **Doors close in (0–0.35s):** two tall cinema doors slide in from the left and right edges and meet in the
   centre, covering the screen. Door look: padded deep-purple leather with vertical stitching, a round porthole
   window in each door with a faint warm glow behind it, brass push plates.
2. **Hold (0.35–0.8s):** a lit sign above the doors flickers on: **"HALL 1"**, with a small line under it:
   "Japito Jibon · 7:30 PM". The 3D hall finishes loading during this hold. If it isn't ready, hold here (the
   sign glows softly) until it is.
3. **Doors open (0.8–1.8s):** the doors **swing inward** (CSS 3D `rotateY`, hinged at the outer edges, perspective
   1200px, `--ease-in-out`), with warm light spilling through the widening gap. Behind them, the camera glides
   from the hall entrance to the seat-selection overview.
- Reduced motion: the doors simply fade out over 400ms.

### 9.5 Step 2 — Seat selection in the 3D hall (`/book/seats/[showId]`)

**Reference:** `references/arena-3d-seat-inspiration.mp4` (the basketball arena: overview → fly in → view from seat).

**Layout:** the 3D hall fills the screen. Overlays:
- **Top-left:** "← Change showtime" + show info: movie · branch · Hall 1 · date · time.
- **Top-right:** `3D / 2D` toggle and **"Best available for [2 ▾]"**.
- **Bottom bar** (glass): seat legend (Premium · Semi-Recliner · Booked · Selected), the selected seats as chips
  (`E7` `E8`), the total price, and **Continue →** (disabled until at least 1 seat is selected).

**Camera — overview (default):**
- **Start position:** behind the last row and high up, looking down at **50–55°**, framed so the **whole seating
  area fills the viewport** (fit to the seat bounding box with ~8% margin; the screen stays visible at the top).
  Every seat in every row must be readable at 1280×720 — this angle is chosen for choosing seats, not for drama.
- **Orbit limits:** left/right **±60°** around the hall centre (never behind the screen); up/down **15°–60°**.
- **Zoom:** from the whole hall down to ~4–5 seats in view (scroll / pinch). Damped, no snapping.
- Clicking a seat block glides the camera towards it (1s, `--ease-in-out`), like the arena video zooming into a section.
- **Reset view** button (Solar "restart" icon) returns to the start position.

**Camera — view from seat:** see "View from seat" below.

**Seat states:**
| State | Look |
|-------|------|
| Available | The branch's seat colour/material (§6 Branch hall themes) |
| **Hover** | Seat brightens (emissive +30%), lifts slightly; **popup** appears above it |
| Selected | Gold glowing outline + lift + small ✓ marker above it (seat keeps its branch colour) |
| **Booked** | Seat turns **dark grey and dimmed** (≈40% brightness) **and** a **stylised seated person** sits in it (see below). Not selectable. The colour change is what makes booked seats readable from the overview, even when the silhouette is tiny. |

**Readability rule:** from the default overview, available vs booked must be obvious at a glance — available seats are
bright in their branch colour, booked seats are dark. Hovering a class in the legend (e.g. "Premium") makes the
**available seats of that class glow softly** for ~1.5s so free seats are easy to find.

**Hover popup** (HTML anchored to the seat, glass card, 200ms fade): `Row E · Seat 7`, seat class, price for this
show, and two buttons: **Select** and **View from seat** (Solar eye icon). On a booked seat the popup only says "Booked".
Clicking the seat itself also toggles selection. Max 10 seats per booking.

**Single-seat gap rule:** if the selection would leave **one empty seat alone** between a selected seat and a
booked seat (or the row end), show a gentle inline hint in the bottom bar — *"This leaves one seat alone. Shift
right?"* with a **Shift** button that moves the selection. It's a suggestion, never a block.

**Seat labels** in the popup, chips and ticket come from the hall data (e.g. `E07` in Hall 1, `D3` in VIP Hall 5).

**Seated people on booked seats:**
- **Simple stylised silhouettes**, low-poly, no faces or details: 3–4 variants (e.g. short hair, longer hair,
  a slimmer and a broader build), mixed male and female, chosen randomly per seat.
- Flat dark colours with slight variation (charcoal, plum, deep blue), faintly rim-lit by the screen light so
  they read as an audience.
- Small random variations: body turned ±5°, slight height differences. Instanced (one draw call per variant).
- Booked seats should cluster naturally (groups of 2–4 together) rather than being scattered evenly.

**View from seat:**
- From the popup (or a selected seat's chip), the camera glides (1.2s, `--ease-in-out`) to that seat at
  **seated eye height**, looking at the centre of the screen. The trailer of the chosen movie plays on the screen.
- Neighbouring seated people are visible in the foreground, which makes the view feel real.
- **Look around:** drag to turn the head a **full 360° left/right** and **±30° up/down** (see the people beside and
  behind, the projector window). The camera stays in the seat — no walking. After the user lets go, it eases back
  to face the screen after ~2s idle.
- HUD: "View from E7" + **Select this seat** (or "Selected ✓") + **← Back to hall** (returns to the previous camera position).

**2D toggle:** a flat seat map generated from the same data (rows, aisles, classes, booked/selected), screen at the
top. Fully keyboard-navigable. Selections are shared with the 3D view.

**Best available:** picks the best adjacent group of N available seats (centre of the hall, middle rows,
together in one row), selects them, and flies the camera to show them.

**Data:** `data/showtimes.json` — `id, branch, hall, movie, date, time, format, priceBand ("matinee" | "evening" |
"weekend"), bookedSeats[]` (generate realistic demo bookings).

### 9.6 Step 3 — Checkout (`/book/checkout`)

**Goal: simple and fast.** One page. No account, no sign-up, no separate review page. Snacks are **out of scope** for now.

**Transition in:** "Continue" fades the 3D hall out and the page settles into the **light theme** (`--paper`),
600ms. The immersive part is over; paying should feel calm and clear.

**Layout (desktop):** two columns in a 1120px container.

**Right column — ticket summary card (sticky)**
- Ticket-shaped card with **semicircle notches** on the left and right edges and a dashed tear line, the same
  language as the "Tonight at" chips (§8.2).
- Top: **"Seats held for 09:42"** countdown. Starts at **10:00** when the user lands on checkout. Turns amber
  in the last 2 minutes.
- Movie poster thumbnail + title; `Bashundhara City · Hall 1 · Today, 7:30 PM`.
- Seats as chips (`E7` `E8`), seat class, and price lines (`2 × Semi-Recliner ৳650`).
- **A small "view from your seat" image**: a still render from the first selected seat (captured from §9.5's
  view-from-seat camera).
- **Total**. **No booking-fee line** (there is no online booking fee).
- Big purple button: **Pay ৳1,300** (always shows the exact total).
- Link under it: "← Change seats" (back to §9.5 with the seats still selected).

**Left column — two short sections**
1. **Your details:** mobile number only (`+880` prefix, Bangladeshi format validated as they type), used to send
   the e-ticket by SMS. Optional email field below it.
2. **Payment method:** three large selectable cards: **bKash · Nagad · Card** (logos + name). **bKash pre-selected.**

**Mobile:** the ticket summary collapses into a sticky bottom bar (total + Pay button); tapping it expands the full summary.

### 9.7 Payment (mock) and edge cases
- **bKash / Nagad:** a short, clean "Connecting to bKash…" screen with the bKash/Nagad colour accent and a
  spinner (~1.5s), then success. No real payment, no real credentials are ever asked for.
- **Card:** a simple mock card form (number, expiry, CVC) with a clear "Demo — no real payment" label; any input succeeds.
- **Payment fails** (add a hidden way to trigger it for the case study): back to checkout with a clear inline
  message; seats are still held; nothing is lost.
- **Timer runs out:** a friendly modal — *"Your seats were released"* — with **Pick seats again**, which reopens
  §9.5 for the same showtime.

**Demo controls (built in Phase 7, for the case study):** a mobile number ending in `0000`, or Alt-click on Pay,
makes the payment fail; `&hold=20` on the checkout URL shortens the seat hold to 20 seconds.

### 9.8 Your ticket — confirmation (`/book/ticket/[bookingId]`)
The reward moment.
- **Ticket "printing" animation (~1.2s):** the ticket slides out from a slot at the top of the card area, like a
  real ticket machine, with a soft paper-shadow; then settles.
- The ticket (same notched ticket shape, purple accent strip):
  - Movie title + poster, branch, hall, date, time, seats, seat class
  - A **QR code** (generated from the booking ID)
  - The **"view from your seat"** image again
  - Booking ID in small monospace
- Under the ticket: *"Show this QR at the hall entrance. A copy was sent to [the number entered at checkout]."*
- Actions: **Save ticket** (as an image) · **Add to calendar** (.ics) · **Get directions** (Google Maps link to the
  branch) · **Back to home**.

### 9.9 Loading, empty and error states
| Situation | What the user sees |
|-----------|--------------------|
| 3D hall loading | A slim `--purple-light` progress bar under the lit sign on the cinema doors (§9.4); the doors open only when ready |
| No shows for the chosen branch/date/movie | In §9.3: *"No shows of Japito Jibon at Bashundhara on Tue 24."* + quick-pick chips for the next dates that have shows |
| Movie not showing at the chosen branch | The movie poster is dimmed in §9.2 with "Not at this branch"; still clickable to see branches that show it |
| Sold-out showtime | Disabled chip: *"Sold out · next show 9:45 PM"* (the next show is a clickable link) |
| All seats booked while choosing | Popup on Continue: *"Seat E07 was just taken"*; the seat turns booked; other selections stay |
| **No WebGL / 3D unsupported or a weak device** | Seat selection opens straight in the **2D map**; the hero shows the poster/video version instead of the live 3D hall; a small note: "Showing the simple view on this device." |
| Trailer fails to load | The movie poster is shown on the hall screen instead |

---

### Sections still to spec
- None — every screen of the case-study flow is spec'd.

**Future work (mention in the case study, don't build):** snacks/combos in checkout, accounts & My tickets, loyalty.

_The designer will spec remaining screens one by one. Add them here instead of inventing content._

---

## 10. Performance & accessibility

- 3D: InstancedMesh for seats (one draw call per seat class), baked/simple lighting, bloom only on emissive parts.
- Target 60fps on a mid-range laptop and 30fps+ on mid-range Android; cap DPR at 2 (1.5 on mobile).
- Trailers: 720p H.264, ≤ 8MB each, poster frame shown until playable. Never autoplay with sound — the only
  exception is the Trailer view (§8.7), which starts with sound because the user clicked "Play Trailer".
- Lazy-load everything below the hero.
- Keyboard: all hero controls reachable by Tab; Escape skips the intro.
- Colour contrast AA for all text on dark.

**Page titles & share preview**
- Titles: "Star Cineplex — Concept Redesign" (home), "Choose your seats · Hall 1 · Star Cineplex" (booking pages), etc.
- Open Graph / Twitter image (1200×630): the 3D hall front view with the Fraunces headline "The best seat in the house is waiting for you."
  and a small "Concept redesign" label — so the demo link looks good on LinkedIn/Behance.
- Favicon: the Star Cineplex star mark (from the logo) on `--purple`.

**Sound (subtle, muted by default)**
- A global sound toggle (Solar volume icon) in the navbar's top strip; **off by default**; remembered in `localStorage`.
- When on: a soft projector hum during the opening (§8.1), a low door "thunk" + soft hall ambience when the cinema
  doors open (§9.4), a gentle paper "print" sound on the ticket (§9.8). All very quiet; never on hover.
- Trailer audio follows its own rules (§8.2 muted, §8.7 on).

---

## 11. Mobile (built in Phase 9)

Planned: shorter opening (≈2s), the hall hero in portrait with the trailer screen in the upper half,
hero info below, "Tonight at" chips as a swipeable row, the navbar reduced to logo + Buy Tickets.

**3D on phones — keep the magic, drop the struggle:**
| Where | Phones |
|-------|--------|
| Opening + hero | A **pre-rendered video loop** of the hall (same look, almost no GPU cost) with the trailer composited on the screen; no live 3D |
| "Choose your experience" seats | Still images (renders) of the 3 seats instead of live turntables |
| Seat selection | Opens in the **2D map by default** (thumb-friendly, precise). **"View from seat" stays 3D**: one fixed camera view from the chosen seat, no orbiting. An **"Explore in 3D"** button offers the full hall on capable phones |
| Capability check | Full 3D only if WebGL2 is available and the device isn't low-end (e.g. `navigator.deviceMemory >= 4` and `hardwareConcurrency >= 4`); otherwise 2D only (§9.9) |


**As built (Phase 9):**
- Device check: `lib/device.ts` (`useDevice()` / `deviceNow()`): phone = width < 768px; full 3D = WebGL2 and, on phones,
  `deviceMemory ≥ 4` and `hardwareConcurrency ≥ 4`.
- Phone hero: `components/home/PhoneHall.tsx` — the still `public/hero/hall-portrait.webp` (1080×2340, rendered from the
  3D hall with the `portrait` camera pose) with the trailer laid over its screen via a CSS `matrix3d` (corners in `QUAD`).
  Info sits under the screen; synopsis hidden; the opening runs 1.3× faster (≈2s).
- "Choose your experience" on phones: `public/seats/{vip,premium,atmos}.webp` (stills of the turntables).
- Seat selection on phones: 2D map first (no WebGL mounted); "View from seat" (eye icon on the seat chips) opens the 3D
  view with a lens wide enough for the whole screen; "Explore in 3D" on capable phones.
- Checkout on phones: sticky bar (seats · hold timer · total · Pay); tapping the total opens the summary as a sheet.
- Re-render the stills with the dev page `/dev/capture` (`?mode=portrait&w=1080&h=2340` for the hall,
  `?turntable=vip&w=1056&h=726` for a seat).
---

## 12. Reference index

| File | Used for | What to take from it |
|------|----------|----------------------|
| `references/opening-projector-beams.png` | §8.1 opening | Composition only: two beams from the bottom corners converging on a centre panel. Not the flat grey/dark colours. |
| `references/hero-current-starcineplex.png` | §8.2 hero | Content structure: eyebrow, title, meta chips, synopsis, two buttons, branch count, carousel dashes, "Tonight at" ticket chips. |
| `references/navbar-notch-tab.png` | §7 navbar | The notch-tab shape hanging from the top edge, compact centred layout, white pill CTA. Not the blue background or the "Supaste" content. |
| `references/navbar-current-starcineplex.png` | §7 navbar | The "before": the full list of information the navbar must keep (phone, Branches, My tickets, EN/বাংলা, 6 links, Buy Tickets). Not its two-row layout. |
| `references/scroll-and-card-hover-reference.webm` | §8.3, §8.4 | Screen recording: the hero-to-section scroll transition (0:02–0:05) and the card hover (0:05–0:12). Claude Code can't watch video; use the frame images below. |
| `references/scroll-hero-to-section-frames.png` | §8.3 | 6 frames of the scroll transition: the hero stays pinned and fades while the next section slides up over it. Not the red "CINEMAX" branding. |
| `references/card-hover-reference.png` | §8.4 | Card hover feel: scale/lift, darkened poster, info inside the card. Not its rating position (ours is top-left) or its red play icon. |
| `references/card-hover-info-current-starcineplex.png` | §8.4 | The info to show on hover (certificate, runtime, language, genres, Play Trailer). Not the popup-outside-the-card layout. |
| `references/glimpse-collage-scroll-reference.webm` | §8.8 | Scattered photo collage with parallax drift on a light background. **Not** the ending where one image expands to fill the screen. |
| `references/FB_IMG_*.jpg` (5 files) | §8.8 | Real Star Cineplex premiere photos — these are the actual content of the glimpse section, not just inspiration. |
| `references/logo.png` | §7, §8.1, §8.8, §8.10 | The official logo (purple "STAR", grey "Cineplex"). Use as-is on light backgrounds; use a white version on dark. |
| `references/arena-3d-seat-inspiration.mp4` | §9.5 seat selection | The original inspiration: 3D venue overview → fly into a section → hover seat info → view from seat. Not its arena geometry, orange/blue colours or prices. |

| `references/seatmap-bashundhara-hall1.png` | §6, §9.5 | **Data source:** Star Cineplex's real Hall 1 seat map (A nearest the screen, no row I, blocks, numbering). Not its visual style. |
| `references/seatmap-bashundhara-hall5-vip.png` | §6, §9.5 | **Data source:** real VIP Hall 5 seat map (right-to-left numbering, side block, gaps). |
| `references/seatmap-example-other-hall-a.png`, `-b.png` | §6 | Examples of how irregular other halls are (shifted blocks, rows starting at B). Not Bashundhara; not used as data. |

| `references/branches/*.jpg` + `SOURCES.md` | §6 Branch hall themes, §8.2, §9.5 | Real hall photos per branch: seat colour, wall treatment, light accents, carpet. **Reference only — never publish these photos.** |

| `references/ai/*.png` (ChatGPT renders) | §8.2, §8.10, §9.3–9.5 | **Look references for the 3D build**, generated from real branch photos. Not final assets, except the footer hall (§8.10). |

| AI file | Use |
|---------|-----|
| `hall-premium-side.png`, `hall-premium-back.png`, `hall-premium-front.png` | Premium hall (Bashundhara look): materials, lights, blue X wall lines, camera angles for the hero and overview |
| `hall-vip-back.png` | VIP Hall 5 mood: oxblood leather, walnut, amber step lights |
| `hall-atmos-back.png` | Atmos Hall 6: wide curved screen, ceiling speakers, blue light strips |
| `seat-premium.png`, `seat-premium-turnaround.png` | Premium seat model (4 angles for modelling) |
| `seat-semi-recliner.png`, `seat-vip.png`, `seat-atmos.png` | Other seat models (§9.3 "Choose your experience" turntables) |
| `cinema-doors.png` | §9.4 doors (sign panel left blank for "HALL 1") |
| `audience-silhouettes.png` | §9.5 booked-seat silhouettes (8 hairstyles); cut out or redraw as simple shapes |
| `footer-hall-logo-photoreal.png` | §8.10 footer — intended result (hall + logo layer) |
| `footer-hall-illustration.png`, `footer-hall-logo-illustrated.png` | Unused alternative footer style (kept for the case study) |

Rule: **follow the written spec; use reference images for look and feel only.**

---

## 13. Open questions (confirm with the designer before building)

- [x] Star Cineplex logo — supplied as PNG (`references/logo.png`). An SVG would be sharper if available.
- [ ] Which 5–6 movies/trailers to feature, and the trailer files (use official trailers only for a private demo;
      check usage before publishing the case study publicly).
- [x] Hero info placement: left side, with the hall seen from the left so the screen sits on the right half.
- [ ] Exact projector-beam colour: pure white light vs. purple-tinted.
- [ ] Real IMDb ratings for the featured movies (placeholders until then).
- [ ] Coming Soon: confirm the release-date pill in place of the rating.
- [x] Branch photos for the film reel: **not available — use the typographic light-leak placeholders (§8.9)** for all 9 frames.
- [ ] One-line copy for film-reel frames 02–09.
- [ ] Real seat map of Bashundhara **Hall 6 Atmos** (currently approximate).
- [ ] Matinee cutoff time (assumed: shows before 5:00 PM).

---

## 14. Build plan (phases)

Build in this order. Finish, run and check each phase before starting the next; the designer gives the go-ahead.

| Phase | What | Done when |
|-------|------|-----------|
| 0 | Project setup: Next.js, Tailwind tokens (§5), fonts, Solar icons, locales, button component, data files (`halls.json` from §6, demo `movies.json`, `showtimes.json`, `branches.json`) | Tokens, fonts and buttons render on a test page; data validates (Hall 1 = 248 seats, Hall 5 = 113) |
| 1 | **3D hall engine**: seat/door/silhouette models (Blender scripts → compressed `.glb`, §4), hall built from the grid patterns, seat models per class, lighting, screen with video texture, seated silhouettes, camera rig | Hall 1 and VIP Hall 5 render correctly from data at 60fps on a laptop |
| 2 | Navbar (§7) + opening sequence (§8.1) + hero with trailer carousel and "Tonight at" strip (§8.2) | Opening → hero works end to end; skip works; plays once per session |
| 3 | Scroll transition (§8.3), `MovieCard` (§8.4), Now Showing (§8.5), Coming Soon (§8.6), Trailer view (§8.7) | All card states and the trailer view work, including Back and the URL |
| 4 | Moments (§8.8), Film Reel (§8.9), Footer (§8.10) | Light/dark transitions feel smooth; reel pins and releases correctly |
| 5 | Booking: §9.2–9.3 (showtime + "Choose your experience"), cinema doors (§9.4) | Every entry point (§9.1) lands correctly |
| 6 | Seat selection (§9.5): hover popup, select, view from seat, 2D map, best available, seat-gap hint | Selection stays in sync between 3D and 2D; keyboard works in 2D |
| 7 | Checkout (§9.6), payment mock (§9.7), ticket (§9.8), states (§9.9) | Full flow from Buy Tickets to the ticket; timer expiry and payment failure both work |
| 8 | Polish: Bangla translation, Prices panel, My tickets, sound, page titles/share image, reduced motion, accessibility pass, a final **Unslop light-slop pass (§16)** over every screen | Checklist in §10 passes; Unslop audit shows no remaining signs outside the protected list |
| 9 | Mobile pass (§11) | Phone flow works with the 2D-first seat selection and the hero video loop |

---

## 15. How to work on this project

- Build **one phase at a time** as instructed; don't start the next screen unprompted.
- Never invent product features, copy or data that aren't in this file. Use clearly marked placeholders.
- After each phase: run it, check it at 1440×900 and 1280×720, and list anything that deviates from this spec.
- Keep components small and named after the spec sections (e.g. `OpeningSequence`, `TonightStrip`).
- After each phase, run the **design QA pass with Unslop** (§16) on the screens built in that phase.

---

## 16. Design QA — the Unslop skill

The **Unslop** skill by Damir Sokolovsky ([@heydamir](https://x.com/heydamir), CC BY 4.0) lives in
`.claude/skills/unslop/`. A copy is in `skills/unslop/` in the project root: if `.claude/skills/unslop/` doesn't exist
yet, move that folder there first (create `.claude/skills/` if needed), then restart Claude Code. It audits a rendered screen for "AI-looking UI" (emoji icons, uppercase tracked labels,
uneven spacing, mixed radii, pointless looping motion, filler visuals, hype copy) and fixes it in nine passes.

**How to run it here**
- After each build phase, screenshot the finished screens (1440×900) and run `/unslop` on them.
- Always use **light slop mode**: this screen is already designed. Fix only what the audit finds, keep the brand,
  palette, type, layout and visuals. Bigger ideas go into the report as **suggestions** for the designer, not changes.
- Show the audit to the designer before editing (the skill does this by default). The designer has the final say.

**Protected decisions — Unslop must not change these (they are the brand and the concept, not slop):**
| Decision | Why it stays |
|----------|--------------|
| Star Cineplex purple `#7F3E98`, `--purple-light`, the logo | The real brand (§5), not a generic AI purple |
| Fraunces **800** display type (§5 Typography) | A deliberate brand choice for big moments; the 400–600 weight rule applies to UI text only |
| The 3D hall, the screen light spill, the trailer glow on the hall | The "moment" of every hall screen — exactly where the skill says richness belongs |
| Gold selected-seat outline/glow `#F5B72E` (§5) | Functional state, the only gold in the UI |
| Footer seat glow, opening projector beams, cinema doors, ticket print (§8.1, §8.10, §9.4, §9.8) | Storytelling moments of the concept |
| Purposeful motion: the opening, scroll transition, Moments parallax, film reel pin, card hover lift (§8) | Designed motion that explains the space; remove only motion that loops for no reason |
| IMDb yellow `#F5C518` rating pill (§8.4) | Recognisable external convention |

**What Unslop should catch and fix (examples):** any emoji left in the UI (use Solar icons), any uppercase tracked
label, off-grid spacing (everything on a 4px grid), inconsistent radii, `transition-all`, looping pulses on things
that are not live, trailing periods on short labels, exclamation marks, placeholder data that looks fake.

Keep the credit "unslop by @heydamir" if any Unslop story video is made for the case study.
