#!/usr/bin/env node
'use strict';
// Page weight (tracker F5): what a visitor downloads for a page, measured in a real browser.
//   npm run weight                 the home page and one project page, on a desktop and a phone size
//   npm run weight -- /work/relic/ another page
// It builds the site into dist-e2e/ (as the browser tests do), serves it on port 4321, opens each page, scrolls
// to the bottom so that every picture loads, and adds up the bytes by kind. Text files are also shown as they
// travel from a real host, compressed (the local server sends them as they are).
// Prints a table to paste into docs/page-weight.md. Read-only apart from dist-e2e/.
/* global document, window -- the function handed to page.evaluate() runs in the browser */
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn, spawnSync } = require('node:child_process');
const { chromium, devices } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: devices['Pixel 7'],
};

const kindOf = (url, type) => {
  if (/\.(woff2?|ttf)$/.test(url)) return 'fonts';
  if (/\.(jpe?g|png|webp|avif|svg|gif)$/.test(url) || type.startsWith('image/')) return 'pictures';
  if (/\.js$/.test(url)) return 'JavaScript';
  if (/\.css$/.test(url)) return 'CSS';
  return 'HTML';
};

async function measure(browser, address, size) {
  const context = await browser.newContext(SIZES[size]);
  const page = await context.newPage();
  const totals = { HTML: 0, CSS: 0, JavaScript: 0, fonts: 0, pictures: 0 };
  const compressed = { HTML: 0, CSS: 0, JavaScript: 0 };
  let requests = 0;
  const pending = [];
  page.on('response', (response) => {
    pending.push(
      response
        .body()
        .then((body) => {
          const kind = kindOf(new URL(response.url()).pathname, response.headers()['content-type'] || '');
          totals[kind] += body.length;
          if (kind in compressed) compressed[kind] += zlib.gzipSync(body).length;
          requests += 1;
        })
        .catch(() => {}),
    );
  });
  await page.goto(BASE + address, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.75) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
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

module.exports = { kindOf };
