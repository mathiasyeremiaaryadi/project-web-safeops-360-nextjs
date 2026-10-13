// Renders public/icons/icon.svg into the PNG sizes required by the web manifest.
// Usage: node scripts/generate-icons.mjs   (requires `pnpm exec playwright install chromium`)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0, radius: true },
  { file: 'icon-512.png', size: 512, padding: 0, radius: true },
  // Maskable: full-bleed background, logo inside the 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.12, radius: false },
  { file: 'apple-touch-icon.png', size: 180, padding: 0, radius: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, padding, radius } of targets) {
  const inner = Math.round(size * (1 - padding * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:${
    radius ? 'transparent' : '#FFD100'
  };display:grid;place-items:center;width:${size}px;height:${size}px">
    <img src="${svgDataUrl}" width="${inner}" height="${inner}" style="${
      radius ? '' : 'clip-path:inset(0 round 0)'
    }"/></body></html>`);
  await page.screenshot({
    path: fileURLToPath(new URL(`../public/icons/${file}`, import.meta.url)),
    omitBackground: radius,
  });
  console.warn(`generated ${file}`);
}
await browser.close();
