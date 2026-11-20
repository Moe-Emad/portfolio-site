'use strict';
// The headers of the site (tracker B8, B11). public/_headers holds them for Cloudflare Pages and Netlify; vercel.json
// gives Vercel, the host of the live site, the same (tools/dev/vercel.test.cjs keeps the two in step); and
// `npm run preview` sends them too (vite.config.js), so the browser tests run under the Content-Security-Policy of the
// live site.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

/** public/_headers as { '/assets/*': { 'Cache-Control': '...' }, ... }, comments left out. */
function readHeadersFile(file = path.join(ROOT, 'public', '_headers')) {
  const rules = {};
  let current = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
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

/** A Content-Security-Policy as { 'script-src': ["'self'", ...], ... }. */
function parsePolicy(policy) {
  return Object.fromEntries(
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((words) => words[0])
      .map(([name, ...sources]) => [name, sources]),
  );
}

/**
 * The inline scripts of a page that the browser runs: every <script> without a src and without a type of data
 * (application/ld+json is data, never run, so a policy does not stop it). Their text exactly as it stands.
 */
function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes]) => !/\bsrc=/.test(attributes) && !/\btype=["']?application\/ld\+json/.test(attributes))
    .map(([, , text]) => text);
}

/** The source under which a Content-Security-Policy lets an inline script run: 'sha256-<base64 of its text>'. */
function scriptHash(text) {
  return `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

module.exports = { ROOT, inlineScripts, parsePolicy, readHeadersFile, scriptHash };
