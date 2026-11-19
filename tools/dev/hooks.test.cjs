'use strict';
// End-to-end tests of the git hooks in .githooks/ (tracker A2): each test makes a throwaway repository that uses
// this repo's hooks and runs the real git commands a developer would run.
//   npm run test:tools
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS = path.resolve(__dirname, '..', '..', '.githooks');

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout}\n${r.stderr}` };
};

/** A new repository on branch main with our hooks, plus an empty remote called origin. */
function makeRepo(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-hooks-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(repo);
  git(dir, 'init', '--bare', '-q', 'origin.git');
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'Hook Test');
  git(repo, 'config', 'user.email', 'hook-test@example.invalid');
  git(repo, 'config', 'commit.gpgsign', 'false');
  git(repo, 'config', 'core.hooksPath', HOOKS);
  git(repo, 'remote', 'add', 'origin', path.join(dir, 'origin.git'));
  return repo;
}

function commit(repo, file, content, message = 'Add a file') {
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), content);
  git(repo, 'add', '-f', file);
  return git(repo, 'commit', '-m', message);
}

// Built at run time, so this file holds no token-shaped text for the scanner to find.
const fakeToken = () => `ghp_${Array.from({ length: 36 }, (_, i) => 'aZ3kQ9xB7mW1'[(i * 7 + 3) % 12]).join('')}`;

test('the hooks exist', () => {
  for (const name of ['pre-commit', 'commit-msg', 'pre-push'])
    assert.ok(fs.existsSync(path.join(HOOKS, name)), `.githooks/${name} is missing`);
});

test('a clean commit passes', (t) => {
  const r = commit(makeRepo(t), 'src/hello.js', "console.log('hello');\n");
  assert.ok(r.ok, r.out);
});

test('a commit with a token in it is refused', (t) => {
  const r = commit(makeRepo(t), 'src/config.js', `export const github = '${fakeToken()}';\n`);
  assert.ok(!r.ok, 'the commit went through');
  assert.match(r.out, /leaks? found|secret/i);
});

test('a .env file is refused, .env.example is not', (t) => {
  const repo = makeRepo(t);
  const env = commit(repo, '.env', 'VITE_APP_NAME=Demo\n');
  assert.ok(!env.ok, 'the .env commit went through');
  assert.match(env.out, /\.env/);
  git(repo, 'reset', '-q');
  const local = commit(repo, '.env.local', 'VITE_APP_NAME=Demo\n');
  assert.ok(!local.ok, 'the .env.local commit went through');
  git(repo, 'reset', '-q');
  const example = commit(repo, '.env.example', 'VITE_APP_NAME=Demo\n');
  assert.ok(example.ok, example.out);
});

test('a database dump is refused', (t) => {
  const r = commit(makeRepo(t), 'database/backup.sql', 'CREATE TABLE users (id INT);\n');
  assert.ok(!r.ok, 'the .sql commit went through');
  assert.match(r.out, /database dump/i);
});

test('a commit message that names an AI tool as co-author is refused', (t) => {
  const repo = makeRepo(t);
  const trailer = commit(repo, 'a.txt', 'a\n', 'Add a\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
  assert.ok(!trailer.ok, 'the commit with the trailer went through');
  const generated = commit(repo, 'a.txt', 'a\n', 'Add a\n\nGenerated with [Claude Code](https://claude.com/claude-code)');
  assert.ok(!generated.ok, 'the commit with the "Generated with" line went through');
  const plain = commit(repo, 'a.txt', 'a\n', 'Add a');
  assert.ok(plain.ok, plain.out);
});

test('a human co-author is allowed', (t) => {
  const r = commit(makeRepo(t), 'a.txt', 'a\n', 'Add a\n\nCo-Authored-By: Sara Ali <sara@example.invalid>');
  assert.ok(r.ok, r.out);
});

test('a push to main is refused, a push to a branch passes', (t) => {
  const repo = makeRepo(t);
  assert.ok(commit(repo, 'a.txt', 'a\n').ok);
  const main = git(repo, 'push', 'origin', 'main');
  assert.ok(!main.ok, 'the push to main went through');
  assert.match(main.out, /pull request/i);
  git(repo, 'checkout', '-q', '-b', 'fix/example');
  const branch = git(repo, 'push', 'origin', 'fix/example');
  assert.ok(branch.ok, branch.out);
});
