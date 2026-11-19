'use strict';
// The settings of the host (tracker B8). The live site is on Vercel, which reads vercel.json and ignores
// public/_headers, the file of Cloudflare Pages and Netlify. Both must give the same headers, so a visitor gets the
// same protection and caching wherever the site is served.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** public/_headers as { '/assets/*': { 'Cache-Control': '...' }, ... }, comments left out. */
function headersFile() {
  const rules = {};
  let current = null;
  for (const line of read('public/_headers').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = rules[line.trim()] = {};
    } else {
      const [key, ...value] = line.trim().split(':');
      current[key.trim()] = value.join(':').trim();
    }
  }
  return rules;
}

/** The headers of vercel.json in the same shape; Vercel writes "/assets/(.*)" where _headers writes "/assets/*". */
function vercelHeaders(config) {
  return Object.fromEntries(
    (config.headers ?? []).map(({ source, headers }) => [
      source.replace('(.*)', '*'),
      Object.fromEntries(headers.map(({ key, value }) => [key, value])),
    ]),
  );
}

test('vercel.json installs exactly what the lock file says and builds without npm', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'vercel.json')), 'vercel.json is missing');
  const config = JSON.parse(read('vercel.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(config.installCommand, 'npm ci', 'npm install would pick new versions and rewrite the lock file');
  // The same build as "npm run build", started with Node.js: Vercel's build machine sets an npm setting that npm 11
  // warns about each time it starts (tracker B7).
  assert.equal(config.buildCommand, pkg.scripts.build);
  assert.equal(config.outputDirectory, 'dist');
});

test('vercel.json sends the same headers as public/_headers', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'vercel.json')), 'vercel.json is missing');
  const expected = headersFile();
  assert.ok(Object.keys(expected['/*'] ?? {}).length >= 4, 'public/_headers has headers for every file');
  assert.deepEqual(vercelHeaders(JSON.parse(read('vercel.json'))), expected);
});
