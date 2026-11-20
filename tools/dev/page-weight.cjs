#!/usr/bin/env node
'use strict';
// Page weight (tracker F5): what a visitor downloads for a page, measured in a real browser.
//   npm run weight                 the home page and one project page, on a desktop (ordinary and sharp) and a phone
//   npm run weight -- /work/relic/ another page
// It builds the site into dist-e2e/ (as the browser tests do), serves it on port 4321, opens each page, brings
// every picture into view and waits until it has loaded, and adds up the bytes by kind. Text files are also shown
// as they travel from a real host, compressed (the local server sends them as they are).
// Prints a table to paste into docs/page-weight.md. Read-only apart from dist-e2e/.
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn, spawnSync } = require('node:child_process');
const { chromium, devices } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  // Two pixels per point, as most laptops sold today (tracker F58).
  'sharp desktop': { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  phone: devices['Pixel 7'],
};

const kindOf = (url, type) => {
  if (/\.(woff2?|ttf)$/.test(url)) return 'fonts';
  if (/\.(jpe?g|png|webp|avif|svg|gif)$/.test(url) || type.startsWith('image/')) return 'pictures';
  if (/\.js$/.test(url)) return 'JavaScript';
  if (/\.css$/.test(url)) return 'CSS';
  return 'HTML';
};

/**
 * Brings every picture a visitor would see into view, one after the other, and waits until each has loaded
 * (tracker B12). Scrolling the window in quick steps missed the lower pictures: the page scrolls smoothly, so each
 * step only started a gliding scroll that the next one replaced, and the page never got near the bottom.
 */
async function loadEveryPicture(page) {
  const pictures = page.locator('img');
  const count = await pictures.count();
  for (let i = 0; i < count; i++) {
    const picture = pictures.nth(i);
    // A hidden picture (a closed menu, another tab) is not loaded by a visitor's browser either.
    if (!(await picture.isVisible())) continue;
    await picture.scrollIntoViewIfNeeded();
    await picture.evaluate((image) =>
      image.complete
        ? undefined
        : new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          }),
    );
  }
}

/** Waits until no request of the page has been open for half a second; gives up after 15 seconds. */
async function untilQuiet(page, openRequests) {
  const giveUpAt = Date.now() + 15_000;
  let quietSince = Date.now();
  while (Date.now() < giveUpAt) {
    if (openRequests() > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= 500) return;
    await page.waitForTimeout(50);
  }
}

/**
 * Opens the address in the page, loads the whole page and adds up what it downloaded, by kind. `pictures` lists
 * the address of every picture counted. Used by `npm run weight` and by a browser test (tracker B12).
 */
async function measurePage(page, address) {
  const totals = { HTML: 0, CSS: 0, JavaScript: 0, fonts: 0, pictures: 0 };
  const compressed = { HTML: 0, CSS: 0, JavaScript: 0 };
  const pictures = [];
  let requests = 0;
  let open = 0;
  const pending = [];
  page.on('request', () => (open += 1));
  page.on('requestfinished', () => (open -= 1));
  page.on('requestfailed', () => (open -= 1));
  page.on('response', (response) => {
    pending.push(
      response
        .body()
        .then((body) => {
          const pathname = new URL(response.url()).pathname;
          const kind = kindOf(pathname, response.headers()['content-type'] || '');
          totals[kind] += body.length;
          if (kind in compressed) compressed[kind] += zlib.gzipSync(body).length;
          if (kind === 'pictures') pictures.push(pathname);
          requests += 1;
        })
        .catch(() => {}),
    );
  });
  await page.goto(address, { waitUntil: 'networkidle' });
  await loadEveryPicture(page);
  // Then whatever the pictures set off: the 'networkidle' of page.goto() was met long ago and would not wait.
  await untilQuiet(page, () => open);
  await Promise.all(pending);
  return { requests, totals, compressed, pictures };
}

async function measure(browser, address, size) {
  const context = await browser.newContext(SIZES[size]);
  const page = await context.newPage();
  const { requests, totals, compressed } = await measurePage(page, BASE + address);
  await context.close();
  // What travels: text compressed, fonts and pictures as they are.
  const travels = compressed.HTML + compressed.CSS + compressed.JavaScript + totals.fonts + totals.pictures;
  return { address, size, requests, totals, compressed, travels };
}

const kB = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;

async function main() {
  const addresses = process.argv.slice(2).filter((argument) => argument.startsWith('/'));
  const pages = addresses.length ? addresses : ['/', '/work/rplms-v2/'];

  const build = spawnSync('node tools/build/build.mjs --mode e2e --outDir dist-e2e', { cwd: ROOT, shell: true, stdio: ['ignore', 'ignore', 'inherit'] });
  if (build.status !== 0) return 1;
  const server = spawn(`npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PORT} --strictPort`, { cwd: ROOT, shell: true, stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch(BASE)).ok) break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    const browser = await chromium.launch();
    const rows = [];
    for (const address of pages) for (const size of Object.keys(SIZES)) rows.push(await measure(browser, address, size));
    await browser.close();

    console.log('| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    for (const row of rows) {
      const { totals, compressed } = row;
      console.log(
        `| \`${row.address}\` | ${row.size} | ${row.requests} | ${kB(compressed.HTML)} | ${kB(compressed.CSS)} | ${kB(compressed.JavaScript)} | ${kB(totals.fonts)} | ${kB(totals.pictures)} | **${kB(row.travels)}** |`,
      );
    }
    console.log('\nHTML, CSS and JavaScript are shown compressed (gzip), as a host sends them. All pictures of the page are counted, also those that load only when scrolled to.');
  } finally {
    // The server was started through a shell: end the whole process tree.
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else server.kill('SIGTERM');
  }
  return 0;
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`page-weight: ${error.stack ?? error}`);
      process.exit(1);
    },
  );
}

module.exports = { kindOf, measurePage };
