'use strict';
// Tests of the audit rule of the gate (tools/dev/gate.cjs): a known advisory passes, a new one fails.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newNpmAdvisories } = require('./gate.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

test('npm: known advisories pass, a new one is reported once per package', () => {
  const audit = {
    vulnerabilities: {
      vite: {
        via: [
          { url: 'https://github.com/advisories/GHSA-known-0000-0000', title: 'Known issue' },
          { url: 'https://github.com/advisories/GHSA-new0-0000-0000', title: 'New issue' },
          'esbuild',
        ],
      },
      plugin: { via: ['vite'] },
      other: { via: [{ url: 'https://github.com/advisories/GHSA-new0-0000-0000', title: 'New issue' }] },
    },
  };
  assert.deepEqual(newNpmAdvisories(audit, ['GHSA-known-0000-0000']), [
    'vite GHSA-new0-0000-0000: New issue',
    'other GHSA-new0-0000-0000: New issue',
  ]);
  assert.deepEqual(newNpmAdvisories(audit, ['GHSA-known-0000-0000', 'GHSA-new0-0000-0000']), []);
});

test('npm: a clean audit passes', () => {
  assert.deepEqual(newNpmAdvisories({ vulnerabilities: {} }, []), []);
});

test('the gate is wired up: npm run gate, and the pre-push hook runs it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.gate, 'node tools/dev/gate.cjs');
  const prePush = fs.readFileSync(path.join(ROOT, '.githooks', 'pre-push'), 'utf8');
  assert.match(prePush, /tools\/dev\/gate\.cjs/);
});

test('hooks and shell scripts keep LF line endings on every PC', () => {
  const attributes = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  assert.match(attributes, /^\* text=auto eol=lf$/m);
  for (const name of fs.readdirSync(path.join(ROOT, '.githooks'))) {
    const text = fs.readFileSync(path.join(ROOT, '.githooks', name), 'utf8');
    assert.ok(!text.includes('\r'), `.githooks/${name} has Windows line endings: sh cannot run it`);
  }
});

// An accepted advisory must say why, and when it was looked at (tracker A6).
test('every listed advisory has an id, a reason and the date it was checked', () => {
  const listed = require('./known-advisories.json').npm;
  for (const [id, reason] of Object.entries(listed)) {
    assert.match(id, /^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/, id);
    assert.equal(typeof reason, 'string', id);
    assert.ok(reason.length >= 80, `${id}: the reason is too short to be one`);
    assert.match(reason, /\b20\d\d-\d\d-\d\d\b/, `${id}: the reason does not say when it was checked`);
  }
});

test('the picomatch advisory without a fixed version is listed', () => {
  const listed = require('./known-advisories.json').npm;
  assert.ok(Object.keys(listed).includes('GHSA-fc5q-39xc-vjpf'));
});
