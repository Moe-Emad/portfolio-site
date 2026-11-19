#!/usr/bin/env node
'use strict';
// Points git at the hooks of this repo (.githooks/): secret scan before each commit, no AI attribution in
// commit messages, no direct push to main. Run it once in every clone (npm runs no install scripts here, see
// .npmrc; the gate checks that it was done):
//   npm run hooks        or        git config core.hooksPath .githooks
// Local git config only; does nothing outside a git checkout and never fails an install.
const { execFileSync } = require('node:child_process');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

try {
  if (git('rev-parse', '--is-inside-work-tree') !== 'true') process.exit(0);
  let current = '';
  try {
    current = git('config', '--local', '--get', 'core.hooksPath');
  } catch {
    // not set yet
  }
  if (current !== '.githooks') {
    git('config', '--local', 'core.hooksPath', '.githooks');
    console.log('git hooks: core.hooksPath set to .githooks');
  }
} catch {
  // not a git checkout, or git missing - nothing to do
}
