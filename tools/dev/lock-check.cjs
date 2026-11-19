#!/usr/bin/env node
'use strict';
// Lock file (tracker A3): an install must give the same packages on every PC, from the place we expect.
//   npm run locks
// Checks, without the network: package.json and package-lock.json name the same dependencies; every locked
// package comes from the npm registry and carries a sha512 checksum (npm ci checks the download against it).
// A bundled package ("inBundle") comes inside the download of the package that carries it, so the checksum of the
// carrier covers it; it only needs a carrier in the lock file (A7).
// Exit code 0 when clean, 1 with one line per problem.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const NPM_REGISTRY = 'https://registry.npmjs.org/';

const sorted = (object) => JSON.stringify(Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b)));

/** The package whose download carries a bundled package: the nearest one above it that is not bundled itself. */
function bundleCarrier(packages, name) {
  let folder = name;
  for (;;) {
    const at = folder.lastIndexOf('/node_modules/');
    if (at < 0) return null;
    folder = folder.slice(0, at);
    if (packages[folder] && !packages[folder].inBundle) return folder;
  }
}

/** Problems of an npm lock file (package-lock.json, lockfileVersion 2 or 3) against its package.json. */
function npmLockProblems(pkg, lock) {
  const problems = [];
  const packages = lock.packages;
  if (!packages || !packages['']) return ['package-lock.json: no "packages" list (lockfileVersion 2 or 3 is needed)'];

  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (sorted(pkg[group]) !== sorted(packages[''][group])) {
      problems.push(`package-lock.json: "${group}" differs from package.json - run "npm install" and commit both files`);
    }
  }
  for (const [name, entry] of Object.entries(packages)) {
    if (name === '') continue;
    if (entry.inBundle) {
      // No address or checksum of its own; its carrier is checked like any other package.
      if (!bundleCarrier(packages, name)) {
        problems.push(`package-lock.json: ${name} is marked as bundled, but no package in the lock file carries it`);
      }
      continue;
    }
    if (entry.link || !String(entry.resolved || '').startsWith(NPM_REGISTRY)) {
      problems.push(`package-lock.json: ${name} does not come from the npm registry (${entry.resolved || 'no address'})`);
    }
    if (!String(entry.integrity || '').startsWith('sha512-')) {
      problems.push(`package-lock.json: ${name} has no sha512 checksum`);
    }
  }
  return problems;
}

function main() {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const problems = npmLockProblems(read('package.json'), read('package-lock.json'));
  if (problems.length) {
    console.log(`lock-check: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
    return 1;
  }
  console.log('lock-check: package-lock.json is clean.');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { npmLockProblems };
