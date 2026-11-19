'use strict';
// Tests of the lock file check (tools/dev/lock-check.cjs, tracker A3).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { npmLockProblems } = require('./lock-check.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SHA = `sha512-${'a'.repeat(86)}==`;
const entry = (name, extra = {}) => ({
  version: '1.0.0',
  resolved: `https://registry.npmjs.org/${name}/-/${name}-1.0.0.tgz`,
  integrity: SHA,
  ...extra,
});
const lockFor = (pkg, packages) => ({
  lockfileVersion: 3,
  packages: {
    '': { dependencies: pkg.dependencies, devDependencies: pkg.devDependencies },
    ...packages,
  },
});

test('a lock file in step with package.json is clean', () => {
  const pkg = { dependencies: { react: '^19.0.0' }, devDependencies: { vite: '^7.0.0' } };
  const lock = lockFor(pkg, { 'node_modules/react': entry('react'), 'node_modules/vite': entry('vite') });
  assert.deepEqual(npmLockProblems(pkg, lock), []);
});

test('a dependency changed in package.json only is reported', () => {
  const pkg = { dependencies: { react: '^19.0.0' } };
  const lock = lockFor({ dependencies: { react: '^18.0.0' } }, { 'node_modules/react': entry('react') });
  assert.match(npmLockProblems(pkg, lock).join('\n'), /"dependencies" differs from package\.json/);
});

test('a package from another server is reported', () => {
  const pkg = { dependencies: { evil: '1.0.0' } };
  const lock = lockFor(pkg, { 'node_modules/evil': entry('evil', { resolved: 'https://example.invalid/evil.tgz' }) });
  assert.match(npmLockProblems(pkg, lock).join('\n'), /evil does not come from the npm registry/);
});

test('a package without a sha512 checksum is reported', () => {
  const pkg = { dependencies: { old: '1.0.0' } };
  const lock = lockFor(pkg, { 'node_modules/old': entry('old', { integrity: 'sha1-abc' }) });
  assert.match(npmLockProblems(pkg, lock).join('\n'), /old has no sha512 checksum/);
});

// A package can carry others inside its own download ("bundleDependencies"). npm lists them with "inBundle" and
// without an address or a checksum: the checksum of the carrier covers them (A7, Tailwind CSS 4.3).
const bundled = (extra = {}) => ({ version: '2.0.0', inBundle: true, optional: true, ...extra });

test('a package bundled inside a package from the registry is accepted', () => {
  const pkg = { dependencies: { carrier: '1.0.0' } };
  const lock = lockFor(pkg, {
    'node_modules/carrier': entry('carrier', { bundleDependencies: ['inner', '@scope/inner'] }),
    'node_modules/carrier/node_modules/inner': bundled(),
    'node_modules/carrier/node_modules/@scope/inner': bundled(),
  });
  assert.deepEqual(npmLockProblems(pkg, lock), []);
});

test('a package bundled inside another bundled package is accepted', () => {
  const pkg = { dependencies: { carrier: '1.0.0' } };
  const lock = lockFor(pkg, {
    'node_modules/carrier': entry('carrier', { bundleDependencies: ['inner'] }),
    'node_modules/carrier/node_modules/inner': bundled(),
    'node_modules/carrier/node_modules/inner/node_modules/deep': bundled(),
  });
  assert.deepEqual(npmLockProblems(pkg, lock), []);
});

test('a package marked as bundled that no package carries is reported', () => {
  const pkg = { dependencies: { stray: '1.0.0' } };
  const lock = lockFor(pkg, { 'node_modules/stray': bundled() });
  assert.match(npmLockProblems(pkg, lock).join('\n'), /stray is marked as bundled, but no package in the lock file carries it/);
});

test('a carrier from another server is reported, its bundled packages are not counted twice', () => {
  const pkg = { dependencies: { carrier: '1.0.0' } };
  const lock = lockFor(pkg, {
    'node_modules/carrier': entry('carrier', { resolved: 'https://example.invalid/carrier.tgz' }),
    'node_modules/carrier/node_modules/inner': bundled(),
  });
  const problems = npmLockProblems(pkg, lock).join('\n');
  assert.match(problems, /carrier does not come from the npm registry/);
  assert.doesNotMatch(problems, /inner/);
});

test('the lock file of this repo is clean', () => {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  assert.deepEqual(npmLockProblems(read('package.json'), read('package-lock.json')), []);
});

test('installs run no package scripts and refuse an old Node.js', () => {
  const npmrc = fs.readFileSync(path.join(ROOT, '.npmrc'), 'utf8');
  assert.match(npmrc, /^ignore-scripts=true$/m);
  assert.match(npmrc, /^engine-strict=true$/m);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.engines?.node, 'package.json has no "engines.node"');
});
