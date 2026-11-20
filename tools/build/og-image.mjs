#!/usr/bin/env node
// The share picture of the site (tracker F4): public/og-image.png, 1200 x 630, shown when a link to the site is
// posted on LinkedIn, WhatsApp and the like. It is the sign of the home page: the name in two scripts on blue,
// with the star, and the headline (F44). The page itself is made by share-page.mjs from content/profile.json; run
// this again after changing the name, the role or the headline there:
//   npm run og-image
// It draws a small page with the fonts of the site in the Chromium of Playwright and photographs it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { sharePage } from './share-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'profile.json'), 'utf8'));
const font = (file) => pathToFileURL(path.join(ROOT, 'node_modules', file)).href;
const html = sharePage(profile, font);

const out = path.join(ROOT, 'public', 'og-image.png');
// The page is written next to node_modules for a moment, so that it may read the font files.
const page_file = path.join(ROOT, 'node_modules', '.og-image.html');
fs.writeFileSync(page_file, html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(page_file).href);
  // Runs inside the page: wait until both fonts are in use.
  await page.evaluate('document.fonts.ready');
  await page.screenshot({ path: out, type: 'png' });
} finally {
  await browser.close();
  fs.rmSync(page_file, { force: true });
}
console.log(`og-image: ${path.relative(ROOT, out)} written (${(fs.statSync(out).size / 1024).toFixed(0)} kB)`);
