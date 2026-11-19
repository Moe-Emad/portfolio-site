#!/usr/bin/env node
'use strict';
// The gate (tracker A4): every check of this project in one command. Run it before each commit; the pre-push
// hook runs it before each push and GitHub runs it on every pull request.
//   npm run gate            all checks
//   npm run gate -- --fast  without the audit and the build (no network needed)
// Stops at the first failing step and prints that step's output. Read-only, except "npm run build" (dist/).
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FAST = process.argv.includes('--fast');

/** Advisories of "npm audit --json" that are not listed in tools/dev/known-advisories.json. */
function newNpmAdvisories(audit, knownIds) {
  const found = [];
  for (const [pkg, vulnerability] of Object.entries(audit.vulnerabilities || {})) {
    for (const via of vulnerability.via || []) {
      if (typeof via === 'string') continue; // vulnerable only through another package, which has its own entry
      const id = String(via.url || '').split('/').pop();
      if (!knownIds.includes(id)) found.push(`${pkg} ${id}: ${via.title}`);
    }
  }
  return found;
}

/**
 * Accepted advisories (tools/dev/known-advisories.json) that "npm audit --json" no longer reports, because they were
 * fixed or withdrawn (A8). Left on the list, they would hide the same advisory if it ever came back.
 */
function staleNpmAdvisories(audit, knownIds) {
  const reported = new Set();
  for (const vulnerability of Object.values(audit.vulnerabilities || {})) {
    for (const via of vulnerability.via || []) {
      if (typeof via !== 'string') reported.add(String(via.url || '').split('/').pop());
    }
  }
  return knownIds.filter((id) => !reported.has(id));
}

/** Runs a command line in the repo root; npm and npx are .cmd files on Windows, hence the shell. */
function run(commandLine) {
  const r = spawnSync(commandLine, { cwd: ROOT, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || '', out: `${r.stdout || ''}${r.stderr || ''}` };
}

const ok = (commandLine) => () => {
  const r = run(commandLine);
  return r.status === 0 ? null : r.out || `"${commandLine}" stopped with exit code ${r.status}`;
};

function npmAudit() {
  const r = run('npm audit --json');
  let audit;
  try {
    audit = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
  } catch {
    return `npm audit gave no JSON:\n${r.out}`;
  }
  if (audit.error) return `npm audit failed: ${JSON.stringify(audit.error)}`;
  const known = Object.keys(require('./known-advisories.json').npm);
  const found = newNpmAdvisories(audit, known);
  if (found.length) {
    return `New npm advisories (fix inside the major, or list in tools/dev/known-advisories.json with the reason):\n  ${found.join('\n  ')}`;
  }
  const stale = staleNpmAdvisories(audit, known);
  return stale.length
    ? `Accepted advisories that npm audit no longer reports (fixed or withdrawn) - remove them from tools/dev/known-advisories.json:\n  ${stale.join('\n  ')}`
    : null;
}

/** The commits of this branch that are not on main yet; null when origin/main is unknown (a fresh clone). */
function branchRange() {
  return run('git rev-parse --verify --quiet origin/main').status === 0 ? 'origin/main..HEAD' : null;
}

const insideGit = () => run('git rev-parse --is-inside-work-tree').stdout.trim() === 'true';

function hooksOn() {
  const hooksPath = run('git config --get core.hooksPath').stdout.trim();
  return hooksPath === '.githooks'
    ? null
    : `core.hooksPath is "${hooksPath}", not ".githooks": the secret scan and the other hooks do not run.\nSwitch them on with: npm run hooks`;
}

/** Steps that exist only once their item has merged: the script must be in package.json. */
function optional(name, script) {
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
  return scripts[script] ? [[name, ok(`npm run ${script}`)]] : [];
}

function steps() {
  const range = branchRange();
  const list = [
    ['lock file: made from package.json, npm registry only, checksums', ok('node tools/dev/lock-check.cjs')],
    ['code style (ESLint, no warnings)', ok('npm run lint')],
    ...optional('types (TypeScript)', 'typecheck'),
    ['tool tests (git hooks, gate, lock file, imports)', ok('npm run test:tools')],
    ...optional('unit tests', 'test:unit'),
  ];
  if (insideGit()) {
    // npm does not run our "prepare" script (.npmrc: ignore-scripts), so a clone has no hooks until this is done.
    list.unshift(['git hooks are switched on (npm run hooks)', hooksOn]);
  }
  if (range) {
    list.push(
      ['no AI attribution in the commits of this branch', ok(`node tools/dev/commit-attribution.cjs --range ${range}`)],
      ['no secrets in the commits of this branch (gitleaks)', ok(`node tools/dev/secret-scan.cjs range ${range}`)],
    );
  }
  if (!FAST) {
    list.push(['npm audit: no new advisory, no stale accepted one', npmAudit], ['the site builds (Vite)', ok('npm run build')]);
  }
  return list;
}

function main() {
  const started = Date.now();
  const list = steps();
  for (const [index, [name, check]] of list.entries()) {
    const t = Date.now();
    process.stdout.write(`[${index + 1}/${list.length}] ${name} ... `);
    const failure = check();
    const seconds = ((Date.now() - t) / 1000).toFixed(1);
    if (failure !== null) {
      console.log(`FAILED (${seconds}s)\n\n${failure.trim()}\n\ngate: FAILED at "${name}" - fix it and run the gate again.`);
      return 1;
    }
    console.log(`ok (${seconds}s)`);
  }
  const total = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`gate: all ${list.length} checks passed in ${total}s${FAST ? ' (fast: audit and build skipped)' : ''}.`);
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { newNpmAdvisories, staleNpmAdvisories };
