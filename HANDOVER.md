# Over Exposure Productions — Website Handover

A hand-built, production-grade static site for **Over Exposure Productions** — a
**production & film servicing company** at Yas Creative Hub, Yas Island, Abu Dhabi, UAE,
connecting international filmmakers, studios, broadcasters and brands with the UAE's
production ecosystem. It replaces the old Hostinger builder site and is structured around the
company's **Profile 2026** deck.

- **Stack:** Vite (multi-page) · vanilla JS · hand-rolled CSS · GSAP + ScrollTrigger + GSAP Flip · Lenis smooth scroll · sharp (asset pipeline)
- **No** UI kits, no Bootstrap/Tailwind, no Google-Fonts network request (fonts are self-hosted).
- Output is **plain static HTML** — one real file per route, so crawlers get full markup.

---

## 1. Run it

```bash
npm install          # install dependencies
npm run harvest      # (first time) download old-site media + fonts into /public
npm run dev          # local dev server  ->  http://localhost:5173
npm run build        # production build   ->  ./dist  (runs the asset pipeline first)
npm run preview      # serve ./dist locally to sanity-check the build
```

`npm run build` auto-runs `scripts/generate-assets.mjs` (the `prebuild` hook): it derives the
logo mark, favicons, OG image, and **WebP responsive variants** for every image in
`/public/media` *and* `/public/images/**`.

### Deploying
Upload the contents of **`dist/`** to any static host (Hostinger static, Netlify, Vercel,
Cloudflare Pages, S3 …). No server/Node runtime needed in production.

> **Clean URLs.** Pages are emitted as `services/index.html` etc. and all internal links +
> canonicals use a **trailing slash** (`/services/`) — this resolves `200` with no redirect on
> every host.

---

## 2. Pages

| Route | What it is |
|-------|------------|
| `/` | The **Profile 2026 deck** — a 14-section long-scroll narrative (hero → intro/stats → executive summary → work categories → why Abu Dhabi → core services → supplier capabilities → film services → production credits → leadership → why OX → future vision → clients → filmography preview → contact CTA). |
| `/services/` | **Services & Capabilities** — core services, supplier-capability phases, film servicing & rebate, differentiators. |
| `/portfolio/` | **Filmography** — all 53 production-credit posters in a filterable-ready grid with a video-ready lightbox. |
| `/contact/` | Contact details (copy-to-clipboard), enquiry form, embedded map. |
| `404` | Custom "scene missing" film-slate page. |

---

## 3. Content is data-driven — edit `src/data/content.js`

**One file is the source of truth for all copy & media slots.** It's imported both by
`vite.config.js` (to render into **static HTML** at build time) and by the client JS (lightbox).

Exports:
- **Base:** `site` (contact details, address, geo), `services` (used by the contact form's
  Project-Type dropdown), `testimonials`, `portfolio`, `marquee`, `heroWords`.
- **Deck (verbatim from Profile 2026):** `hero`, `intro` (stats), `execSummary`,
  `workCategories`, `whyAbuDhabi`, `coreServices`, `supplierCaps`, `filmServices`,
  `productionCredits` (Hollywood/Bollywood + GCC lists), `team` (CEO + 3 members),
  `whyOx`, `futureVision`, `clients` (tag chips), `posters` (53 filmography posters).

Change any text/stat/credit/team bio here — the pages re-render it on `npm run build`.

---

## 4. Imagery — where it lives & how to swap it

Two image roots, both auto-processed into `-480/-800/-1200.webp` variants by the asset pipeline:

- **`/public/media/`** — the *old site's* harvested stock (5 behind-the-scenes stills + 2 Pexels
  background videos the old site used). The home hero video (`hero-reel-720.mp4`, 3.3 MB) loads
  only on capable desktops; the 24 MB 1080p original is kept but not referenced by default.
- **`/public/images/`** — the **Profile 2026 deck imagery**, organised by section:
  - `backgrounds/` — section background stills (`01-hero…` → `13-clients…`)
  - `team/` — the 4 leadership photos (CEO, GM, Director, CFO)
  - `posters/` — 53 filmography posters (`poster-01.jpg` → `poster-53.jpg`)
  - `clients/` — client campaign imagery

**To swap any image:** drop the new file in the right folder, point the matching path in
`content.js` at it, and run `npm run build` (variants regenerate automatically). To add/remove
posters, edit the `posters` generator in `content.js` and drop files in `/public/images/posters/`.

> **Re-harvesting** (`npm run harvest`) only re-pulls the old-site `/public/media` assets + fonts;
> it does not touch `/public/images` (those are the deck assets you supply). Any download failure
> is logged to `scripts/harvest-failures.log` and, for stills, auto-substituted so no slot is
> ever empty. Last run: **13/13 assets, 0 failures.**

---

## 5. Contact form endpoint

`src/js/contact.js` uses a **`mailto:` fallback** (no backend) + client validation + a honeypot.
To use **Formspree**/serverless: find the block **"OPTION A — Formspree / serverless endpoint"**,
set `ENDPOINT`, and uncomment it. The hidden `name="company"` field is the honeypot — keep it.

---

## 6. SEO / meta

Per-page `title`, `description`, `canonical` and JSON-LD live in **`vite.config.js` → `pages`**.
Structured data: **LocalBusiness** (home + contact), **Service** graph built from
`coreServices` (services page), **BreadcrumbList** (every page). Business facts come from
`content.js → site`. Open Graph/Twitter tags + the generated `og-default.jpg` are in
`src/partials/head.html`. `public/sitemap.xml` + `public/robots.txt` list the routes — update
`lastmod`/routes there. Handlebars helpers (`pad2`, `inc`, `webp`, `webpset`, `eq`) are in
`vite.config.js`.

To change the domain: update `baseUrl` in `content.js`, plus the sitemap/robots.

---

## 7. Design & resilience

- **Palette:** charcoal-black `#0B0C0E`, cool off-white `#EDEFF2`, steel `#8A9099`. Two accents:
  **signal red `#E5352B`** (the REC record-light motif — nav, cursor, dots) and **warm gold
  `#CBA35B`** (the profile-deck highlight — section numbers, stats, headings).
- **Type:** self-hosted **Bebas Neue** (display) + **Inter** (body), `woff2`, `font-display: swap`.
- **Motion** respects `prefers-reduced-motion`. All hidden "reveal" states are gated behind
  `html.js`, and reveals use IntersectionObserver — so with JS off (or a script error) every
  heading, paragraph and image is fully visible, and content can never get stuck invisible.
- Custom cursor + smooth scroll auto-disable on touch devices.
- One `<h1>` per page, semantic landmarks, descriptive `alt` text, aria labels on icon links.

---

## 8. Content accuracy

All copy, stats (50+ productions, etc.), production credits, client names and team bios are
taken verbatim from the company's Profile 2026 deck — nothing is invented. Poster images are
shown caption-less (the deck's title list did not reliably map to later posters, so no credits
are asserted per poster to avoid mislabeling). The two customer testimonials (Justin Lee,
Omar.A) are verbatim.
