# Over Exposure Productions

Marketing website for **Over Exposure Productions** — a production & film servicing company at
Yas Creative Hub, Yas Island, Abu Dhabi, UAE, built around the company's Profile 2026 deck.

Hand-built with **Vite (multi-page) + vanilla JS + GSAP/ScrollTrigger/Flip + Lenis**, hand-rolled
CSS, self-hosted fonts, and a repeatable media/asset pipeline. Ships as static HTML — one file
per route — for top SEO and Lighthouse scores.

## Quick start

```bash
npm install
npm run harvest   # first run: download real media + fonts into /public
npm run dev       # http://localhost:5173
npm run build     # -> ./dist  (static, deploy anywhere)
npm run preview   # verify the build locally
```

## Pages
`/` · `/services/` · `/portfolio/` · `/contact/` · custom `404`

## Editing content
Everything is data-driven from **`src/data/content.js`** (services, portfolio, testimonials,
contact details). Per-page SEO/meta lives in **`vite.config.js`**.

**See [`HANDOVER.md`](./HANDOVER.md)** for full docs: swapping in real footage, changing the form
endpoint, updating meta tags, the hero video, and deployment/clean-URL notes.
