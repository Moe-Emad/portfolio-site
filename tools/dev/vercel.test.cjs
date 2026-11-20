'use strict';
// The settings of the host (tracker B8, B11). The live site is on Vercel, which reads vercel.json and ignores
// public/_headers, the file of Cloudflare Pages and Netlify. Both must give the same headers, so a visitor gets the
// same protection and caching wherever the site is served.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, inlineScripts, parsePolicy, readHeadersFile, scriptHash } = require('../build/headers.cjs');

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const headersFile = () => readHeadersFile();

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

// The Content-Security-Policy (tracker B11): the site runs its own files and the one inline script of index.html,
// which sets the theme before the first paint and is allowed by its hash. Change that script and its hash changes.
test('the Content-Security-Policy lets only the site and the theme script of index.html run', () => {
  const policy = headersFile()['/*']?.['Content-Security-Policy'];
  assert.ok(policy, 'public/_headers sends no Content-Security-Policy');
  const rules = parsePolicy(policy);

  const scripts = inlineScripts(read('index.html'));
  assert.equal(scripts.length, 1, 'index.html runs exactly one inline script, the theme script');
  const hash = scriptHash(scripts[0]);
  const hashes = (rules['script-src'] ?? []).filter((source) => source.startsWith("'sha"));
  assert.deepEqual(
    hashes,
    [hash],
    `the theme script of index.html has the hash ${hash}: write it in place of ${hashes.join(' ') || 'nothing'} in the Content-Security-Policy of public/_headers and of vercel.json`,
  );

  assert.deepEqual(rules['default-src'], ["'self'"]);
  assert.deepEqual(rules['script-src'], ["'self'", hash], 'scripts only from the site and the theme script; no unsafe-inline, no eval');
  assert.deepEqual(rules['style-src'], ["'self'"], 'stylesheets only from the site');
  // Style attributes: the page writes two (the order of the star's lines, the width of a cover).
  assert.deepEqual(rules['style-src-attr'], ["'unsafe-inline'"]);
  assert.deepEqual(rules['img-src'], ["'self'"]);
  assert.deepEqual(rules['font-src'], ["'self'"]);
  assert.deepEqual(rules['connect-src'], ["'self'", 'https://api.emailjs.com'], 'connections only to the site and to EmailJS (the contact form)');
  assert.deepEqual(rules['object-src'], ["'none'"]);
  assert.deepEqual(rules['base-uri'], ["'none'"]);
  assert.deepEqual(rules['form-action'], ["'self'"]);
  assert.deepEqual(rules['frame-ancestors'], ["'none'"]);
});
