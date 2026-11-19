#!/usr/bin/env node
'use strict';
// Secret scan (tracker A2): keeps keys, passwords, .env files and database dumps out of git.
//   node tools/dev/secret-scan.cjs staged             what "git commit" is about to record (.githooks/pre-commit)
//   node tools/dev/secret-scan.cjs history            every commit of every branch
//   node tools/dev/secret-scan.cjs range <a>..<b>     the commits of a range, e.g. origin/main..HEAD
// Uses gitleaks: one pinned release, downloaded once into a local cache and accepted only when its SHA-256 matches
// the value written below. A gitleaks that happens to be on the PATH is not used.
// Read-only on the repository. Exit 1 = something was found, exit 2 = the scan could not run.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VERSION = '8.30.1';
// From gitleaks_8.30.1_checksums.txt of the release. To move to a new version: change VERSION and all five values.
const SHA256 = {
  'windows_x64.zip': 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e',
  'linux_x64.tar.gz': '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
  'linux_arm64.tar.gz': 'e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080',
  'darwin_x64.tar.gz': 'dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709',
  'darwin_arm64.tar.gz': 'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5',
};
const WIN = process.platform === 'win32';

class ScanError extends Error {}

/** Path of the pinned gitleaks program; downloads and verifies it on first use. */
async function gitleaks() {
  const cache = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache'),
    'portfolio-tools',
    `gitleaks-${VERSION}`,
  );
  const exe = path.join(cache, WIN ? 'gitleaks.exe' : 'gitleaks');
  if (fs.existsSync(exe)) return exe;

  const platform = { win32: 'windows', linux: 'linux', darwin: 'darwin' }[process.platform];
  const build = `${platform}_${process.arch === 'arm64' ? 'arm64' : 'x64'}.${WIN ? 'zip' : 'tar.gz'}`;
  const expected = SHA256[build];
  if (!expected) throw new ScanError(`gitleaks: no pinned build for ${build}`);
  const archive = `gitleaks_${VERSION}_${build}`;
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/${archive}`;
  console.error(`secret-scan: downloading gitleaks ${VERSION} (once) ...`);
  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
  } catch (error) {
    throw new ScanError(`gitleaks download failed (${error.message}) - ${url}`);
  }
  const actual = crypto.createHash('sha256').update(data).digest('hex');
  if (actual !== expected)
    throw new ScanError(`gitleaks ${archive}: checksum mismatch (got ${actual}) - the file was not used`);

  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(path.join(cache, archive), data);
  // Windows' own tar reads zip files; the GNU tar of Git Bash (first on the PATH inside a hook) does not.
  const tar = WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  const unpack = spawnSync(tar, ['-xf', archive], { cwd: cache, stdio: 'inherit' });
  if (unpack.status !== 0 || !fs.existsSync(exe)) throw new ScanError(`gitleaks: could not unpack ${archive}`);
  return exe;
}

/** Staged files that must never be committed, whatever they contain. */
function forbiddenFiles(names) {
  const findings = [];
  for (const name of names) {
    const base = name.split('/').pop();
    if (/^\.env(\..+)?$/.test(base) && base !== '.env.example')
      findings.push(`${name}: .env files hold real settings and passwords - only .env.example is committed`);
    else if (/\.(sql|dump)(\.(gz|zip|bz2|xz))?$/i.test(base))
      findings.push(`${name}: a database dump holds user data and password hashes - never commit one`);
  }
  return findings;
}

function stagedFiles() {
  const r = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { encoding: 'utf8' });
  if (r.status !== 0) throw new ScanError(`git diff --cached failed: ${r.stderr.trim()}`);
  return r.stdout.split('\0').filter(Boolean);
}

async function main() {
  const [mode, value] = process.argv.slice(2);
  const args = ['git', '--no-banner', '--redact', '--verbose'];
  if (mode === 'staged') {
    const findings = forbiddenFiles(stagedFiles());
    if (findings.length) {
      console.error(`secret-scan: not committed -\n  ${findings.join('\n  ')}\nUnstage with: git restore --staged <file>`);
      return 1;
    }
    args.push('--pre-commit', '--staged');
  } else if (mode === 'history') {
    args.push('--log-opts=--all');
  } else if (mode === 'range' && value) {
    args.push(`--log-opts=${value}`);
  } else {
    console.error('usage: secret-scan.cjs staged | history | range <a>..<b>');
    return 2;
  }
  const scan = spawnSync(await gitleaks(), [...args, '.'], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (scan.status === 0) return 0;
  if (scan.status === 1) {
    console.error(
      'secret-scan: a secret was found (see above). Remove it from the change and put the value in .env.\n' +
        'A reviewed false positive goes into .gitleaksignore with its reason.',
    );
    return 1;
  }
  throw new ScanError(`gitleaks stopped with exit code ${scan.status}`);
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`secret-scan: ${error instanceof ScanError ? error.message : error.stack}`);
      process.exit(2);
    },
  );
}

module.exports = { forbiddenFiles, gitleaks, VERSION };
