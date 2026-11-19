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
