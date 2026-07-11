/**
 * harvest-media.mjs
 * ---------------------------------------------------------------------------
 * Repeatable harvest of every real media asset used by the OLD live site
 * (ox.productionsuae.com — a Hostinger/Zyro builder export).
 *
 * Downloads:
 *   - the OX logo               -> public/assets/logo.png
 *   - 5 behind-the-scenes stills -> public/media/*.jpg   (highest-res originals)
 *   - 2 background videos        -> public/media/*.mp4   (Pexels stock the old
 *                                   site actually used; swappable — see HANDOVER)
 *   - self-hosted webfonts       -> public/assets/fonts/*.woff2
 *
 * Robustness: each asset is fetched with retry + exponential backoff and, where
 * a CDN offers resize params, an alternate URL form. Any permanent failure is
 * logged to scripts/harvest-failures.log and (for images) substituted with an
 * already-harvested still so the build is NEVER left with an empty slot.
 *
 * Run:  npm run harvest
 * ---------------------------------------------------------------------------
 */
import { mkdir, writeFile, appendFile, access, readdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEDIA_DIR = resolve(ROOT, 'public/media');
const ASSET_DIR = resolve(ROOT, 'public/assets');
const FONT_DIR = resolve(ROOT, 'public/assets/fonts');
const FAIL_LOG = resolve(__dirname, 'harvest-failures.log');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const ZY = 'https://assets.zyrosite.com/YanqlWqK6zTvaqZ6';
const ZY_RS = 'https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=2000';

/**
 * Asset manifest. `urls` is tried in order until one succeeds.
 * `fallbackFrom` (images only) names another asset key whose bytes are copied
 * in if every URL fails — guaranteeing a populated slot.
 */
const ASSETS = [
  // --- logo -----------------------------------------------------------------
  {
    key: 'logo',
    out: resolve(ASSET_DIR, 'logo.png'),
    urls: [`${ZY}/over-exposure-logo-FkZ01xbS1zKQ75qX.png`],
  },
  // --- stills (highest-res original first, resized CDN form as fallback) -----
  {
    key: 'set-desert-corporate',
    out: resolve(MEDIA_DIR, 'set-desert-corporate.jpg'),
    urls: [
      `${ZY}/1765fc74-43dc-434e-a847-45ea1c59b2d9-6smzo5cvULW6HWxX.jpeg`,
      `${ZY_RS}/YanqlWqK6zTvaqZ6/1765fc74-43dc-434e-a847-45ea1c59b2d9-6smzo5cvULW6HWxX.jpeg`,
    ],
  },
  {
    key: 'monitor-rec-post',
    out: resolve(MEDIA_DIR, 'monitor-rec-post.jpg'),
    urls: [
      `${ZY}/62e09dac-8045-45fa-bfc7-ed22e3ad124d-agWLMqKUOBipWB2N.jpeg`,
      `${ZY_RS}/YanqlWqK6zTvaqZ6/62e09dac-8045-45fa-bfc7-ed22e3ad124d-agWLMqKUOBipWB2N.jpeg`,
    ],
    fallbackFrom: 'set-desert-corporate',
  },
  {
    key: 'hangar-film-production',
    out: resolve(MEDIA_DIR, 'hangar-film-production.jpg'),
    urls: [
      `${ZY}/658e3196-368c-40ce-8a1a-f846fa0cd06e-Ii4aMFo1179cyThv.jpeg`,
      `${ZY_RS}/YanqlWqK6zTvaqZ6/658e3196-368c-40ce-8a1a-f846fa0cd06e-Ii4aMFo1179cyThv.jpeg`,
    ],
    fallbackFrom: 'set-desert-corporate',
  },
  {
    key: 'night-set-lighting',
    out: resolve(MEDIA_DIR, 'night-set-lighting.jpg'),
    urls: [
      `${ZY}/78b3c801-3656-4c16-b7bc-a3135675153a-sJ6qGGDWPMahJm03.jpeg`,
      `${ZY_RS}/YanqlWqK6zTvaqZ6/78b3c801-3656-4c16-b7bc-a3135675153a-sJ6qGGDWPMahJm03.jpeg`,
    ],
    fallbackFrom: 'set-desert-corporate',
  },
  {
    key: 'event-night-gear',
    out: resolve(MEDIA_DIR, 'event-night-gear.jpg'),
    urls: [
      `${ZY}/94666811-06bd-42dc-9c4b-0bf6f74c8d12-WYsASNFK6cb65JkZ.jpeg`,
      `${ZY_RS}/YanqlWqK6zTvaqZ6/94666811-06bd-42dc-9c4b-0bf6f74c8d12-WYsASNFK6cb65JkZ.jpeg`,
    ],
    fallbackFrom: 'night-set-lighting',
  },
  // --- background videos the old site used (Pexels stock; swappable) --------
  {
    key: 'hero-reel-1080',
    out: resolve(MEDIA_DIR, 'hero-reel-1080.mp4'),
    urls: ['https://videos.pexels.com/video-files/2512877/2512877-hd_1920_1080_30fps.mp4'],
    optional: true,
  },
  {
    key: 'hero-reel-720',
    out: resolve(MEDIA_DIR, 'hero-reel-720.mp4'),
    urls: ['https://videos.pexels.com/video-files/2512878/2512878-hd_1280_720_30fps.mp4'],
    optional: true,
  },
  // --- self-hosted webfonts (fontsource, latin subset) ----------------------
  fontAsset('bebas-neue', 400),
  fontAsset('inter', 400),
  fontAsset('inter', 500),
  fontAsset('inter', 600),
  fontAsset('inter', 700),
];

function fontAsset(family, weight) {
  return {
    key: `font-${family}-${weight}`,
    out: resolve(FONT_DIR, `${family}-${weight}.woff2`),
    urls: [
      `https://cdn.jsdelivr.net/fontsource/fonts/${family}@latest/latin-${weight}-normal.woff2`,
    ],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchBytes(url, { attempts = 4 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 512) throw new Error(`suspiciously small (${buf.length}B)`);
      return buf;
    } catch (err) {
      lastErr = err;
      const backoff = 400 * 2 ** i;
      process.stdout.write(`   retry ${i + 1}/${attempts} in ${backoff}ms (${err.message})\n`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

const results = { ok: [], failed: [], substituted: [] };
const bytesByKey = new Map();

async function harvest(asset) {
  process.stdout.write(`-> ${asset.key}\n`);
  for (const url of asset.urls) {
    try {
      const buf = await fetchBytes(url);
      await mkdir(dirname(asset.out), { recursive: true });
      await writeFile(asset.out, buf);
      bytesByKey.set(asset.key, buf);
      results.ok.push(asset.key);
      process.stdout.write(`   ok  ${(buf.length / 1024).toFixed(0)} KB  (${asset.out.replace(ROOT, '.')})\n`);
      return;
    } catch (err) {
      process.stdout.write(`   fail ${url} -> ${err.message}\n`);
    }
  }
  // all URLs exhausted
  await appendFile(FAIL_LOG, `${new Date().toISOString()}  ${asset.key}  ${asset.urls.join(' | ')}\n`);
  if (asset.fallbackFrom && bytesByKey.has(asset.fallbackFrom)) {
    await mkdir(dirname(asset.out), { recursive: true });
    await writeFile(asset.out, bytesByKey.get(asset.fallbackFrom));
    results.substituted.push(`${asset.key} <= ${asset.fallbackFrom}`);
    process.stdout.write(`   SUBSTITUTED with ${asset.fallbackFrom} (logged)\n`);
  } else {
    results.failed.push(asset.key);
    process.stdout.write(`   FAILED (logged)${asset.optional ? ' [optional]' : ''}\n`);
  }
}

async function main() {
  await mkdir(MEDIA_DIR, { recursive: true });
  await mkdir(FONT_DIR, { recursive: true });
  for (const asset of ASSETS) await harvest(asset);

  console.log('\n================ HARVEST SUMMARY ================');
  console.log(`  downloaded : ${results.ok.length}`);
  console.log(`  substituted: ${results.substituted.length}${results.substituted.length ? ' -> ' + results.substituted.join(', ') : ''}`);
  console.log(`  failed     : ${results.failed.length}${results.failed.length ? ' -> ' + results.failed.join(', ') : ''}`);
  const media = (await readdir(MEDIA_DIR)).sort();
  console.log('  /public/media:', media.join(', '));
  console.log('================================================\n');
  if (results.failed.some((k) => !ASSETS.find((a) => a.key === k)?.optional)) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
