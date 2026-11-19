#!/usr/bin/env node
'use strict';
// Browser tests (tracker A5): npm run test:browser [-- <arguments for "playwright test">]
//   1. builds the site into dist-e2e/ with made-up EmailJS settings (no real key is used or needed; the tests
//      answer the EmailJS requests themselves, so no mail is ever sent)
//   2. runs the tests in tests/browser with Playwright, which serves dist-e2e/ on port 4319 (playwright.config.js)
// Desktop and phone sizes. The browser is installed once with: npx playwright install chromium
// The dev server (5173), a preview (4173) and dist/ are not touched.
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = 'dist-e2e';

// Made-up values, only for this build. The tests look for them in the requests the form makes.
const E2E_EMAILJS = {
  VITE_APP_EMAILJS_SERVICE_ID: 'e2e_service',
  VITE_APP_EMAILJS_TEMPLATE_ID: 'e2e_template',
  VITE_APP_EMAILJS_PUBLIC_KEY: 'e2e_public_key',
};
// A made-up address of the site, so that the build writes the tags that need one (sitemap, canonical links).
const E2E_SITE_URL = 'https://portfolio.example';

function main() {
  const env = { ...process.env, ...E2E_EMAILJS, VITE_SITE_URL: E2E_SITE_URL, E2E_BUILD: OUT, E2E_SITE_URL };
  const run = (commandLine) => spawnSync(commandLine, { cwd: ROOT, shell: true, stdio: 'inherit', env }).status;

  // --mode e2e: Vite does not read .env / .env.local of this PC into the test build, only the values above.
  if (run(`node tools/build/build.mjs --mode e2e --outDir ${OUT}`) !== 0) {
    console.error('browser-tests: the site could not be built.');
    return 1;
  }
  const extra = process.argv
    .slice(2)
    .map((argument) => JSON.stringify(argument))
    .join(' ');
  return run(`npx playwright test ${extra}`) ?? 1;
}

if (require.main === module) process.exit(main());

module.exports = { E2E_EMAILJS, E2E_SITE_URL };
