/**
 * generate-assets.mjs
 * ---------------------------------------------------------------------------
 * Derives all secondary assets from the harvested originals (idempotent):
 *   - public/assets/logo-mark.png   isolated brand badge, transparent (on-dark)
 *   - favicons (16/32/48/180/512) + favicon.ico + site.webmanifest
 *   - public/assets/og-default.jpg  1200x630 social card (dark + logo + tagline)
 *   - public/media/*-{480,800,1200}.webp  responsive next-gen variants of stills
 *
 * Runs automatically on `npm run build` (prebuild) and via `npm run assets`.
 * Requires the harvest to have run first (npm run harvest).
 * ---------------------------------------------------------------------------
 */
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename, extname, join } from 'node:path';

const ASSET = resolve('public/assets');
const MEDIA = resolve('public/media');
const IMAGES = resolve('public/images');
const LOGO = resolve(ASSET, 'logo.png');
const RED = '#E5352B';
const DARK = '#0B0C0E';

/* --- 1. Isolated brand badge (transparent) from the white-bg logo --------- */
// Badge bounding box measured from the 500x500 source (see scripts/_inspect).
const BADGE = { left: 126, top: 111, width: 249, height: 249 };
const markBuf = await sharp(LOGO).extract(BADGE).resize(512, 512, { fit: 'cover' }).toBuffer();
const roundMask = Buffer.from(
  `<svg width="512" height="512"><rect width="512" height="512" rx="104" ry="104" fill="#fff"/></svg>`
);
const logoMark = await sharp(markBuf)
  .composite([{ input: roundMask, blend: 'dest-in' }])
  .png()
  .toBuffer();
await writeFile(resolve(ASSET, 'logo-mark.png'), logoMark);

/* --- 2. Favicons + app icons --------------------------------------------- */
const darkTile = (size, pad) =>
  sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${DARK}"/></svg>`
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

async function icon(size, { tile = false, pad = 0 } = {}) {
  const inner = size - pad * 2;
  const mark = await sharp(logoMark).resize(inner, inner).toBuffer();
  if (tile) {
    const bg = await darkTile(size);
    return sharp(bg).composite([{ input: mark, top: pad, left: pad }]).png().toBuffer();
  }
  return sharp(mark).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

for (const s of [16, 32, 48]) await writeFile(resolve(ASSET, `favicon-${s}.png`), await icon(s));
await writeFile(resolve(ASSET, 'apple-touch-icon.png'), await icon(180, { tile: true, pad: 22 }));
await writeFile(resolve(ASSET, 'icon-512.png'), await icon(512, { tile: true, pad: 64 }));
await writeFile(resolve(ASSET, 'icon-192.png'), await icon(192, { tile: true, pad: 24 }));

// favicon.ico — wrap a 32x32 PNG in a minimal ICO container (PNG-in-ICO).
const png32 = await icon(32, { tile: true, pad: 3 });
const ico = Buffer.alloc(6 + 16 + png32.length);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); // header: type=icon, count=1
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); // 32x32
ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png32.length, 14);
ico.writeUInt32LE(6 + 16, 18);
png32.copy(ico, 22);
await writeFile(resolve(ASSET, 'favicon.ico'), ico);

// Web manifest
await writeFile(
  resolve(ASSET, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'Over Exposure Productions',
      short_name: 'Over Exposure',
      description: 'Film & video production company in Abu Dhabi, UAE.',
      start_url: '/',
      display: 'standalone',
      background_color: DARK,
      theme_color: DARK,
      icons: [
        { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2
  )
);

/* --- 3. Open Graph card 1200x630 ----------------------------------------- */
const ogMark = await sharp(logoMark).resize(150, 150).toBuffer();
const ogSvg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${DARK}"/>
  <rect width="1200" height="6" fill="${RED}"/>
  <g font-family="Arial Narrow, Arial, sans-serif" fill="#EDEFF2">
    <text x="90" y="300" font-size="34" letter-spacing="10" fill="#8A9099" font-family="Consolas, monospace">FILM &amp; VIDEO PRODUCTION</text>
    <text x="88" y="410" font-size="128" font-weight="700" letter-spacing="2">OVER EXPOSURE</text>
    <text x="92" y="500" font-size="58" font-weight="700" letter-spacing="18" fill="#8A9099">PRODUCTIONS</text>
  </g>
  <g transform="translate(90,520)">
    <circle cx="10" cy="18" r="9" fill="${RED}"/>
    <text x="30" y="26" font-size="30" fill="#8A9099" font-family="Consolas, monospace" letter-spacing="4">CRAFTING VISUAL STORIES — ABU DHABI, UAE</text>
  </g>
</svg>`;
await sharp(Buffer.from(ogSvg))
  .composite([{ input: ogMark, top: 60, left: 1200 - 150 - 90 }])
  .jpeg({ quality: 86 })
  .toFile(resolve(ASSET, 'og-default.jpg'));

/* --- 4. Responsive WebP variants of every still -------------------------- */
const WIDTHS = [480, 800, 1200];
const stills = (await readdir(MEDIA)).filter((f) => /\.(jpe?g|png)$/i.test(f) && !/-\d+\.webp$/.test(f));
let variants = 0;
for (const file of stills) {
  const name = basename(file, extname(file));
  for (const w of WIDTHS) {
    await sharp(resolve(MEDIA, file))
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 74 })
      .toFile(resolve(MEDIA, `${name}-${w}.webp`));
    variants++;
  }
}

/* --- 5. Responsive WebP variants of the deck imagery (public/images/**) ----
   The <picture> `pic` partial emits -480/-800/-1200.webp srcset entries, so the
   deck backgrounds, team cutouts and posters need the same variant set as the
   /media stills. Walk the subfolders (backgrounds/team/clients/posters) and
   derive variants next to each original. withoutEnlargement keeps small posters
   from upscaling. Preserves transparency for the alpha team cutouts. */
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(jpe?g|png)$/i.test(entry.name) && !/-\d+\.webp$/.test(entry.name)) out.push(p);
  }
  return out;
}

let imgVariants = 0;
let imgOriginals = 0;
try {
  const files = await walk(IMAGES);
  imgOriginals = files.length;
  for (const file of files) {
    const dir = resolve(file, '..');
    const name = basename(file, extname(file));
    for (const w of WIDTHS) {
      await sharp(file)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(resolve(dir, `${name}-${w}.webp`));
      imgVariants++;
    }
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // public/images is optional
}

console.log(`assets: logo-mark + ${['16','32','48','180','192','512'].length} icons + favicon.ico + og-default.jpg + ${variants} webp variants (${stills.length} stills) + ${imgVariants} deck webp variants (${imgOriginals} images)`);
