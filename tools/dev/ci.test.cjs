'use strict';
// Rules for the workflows in .github/workflows (tracker A4): a workflow is code that runs with access to the
// repository, so it follows the same supply-chain rules as the rest. Plain text checks, no YAML package.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, '.github', 'workflows');
const workflows = fs.existsSync(DIR)
  ? fs
      .readdirSync(DIR)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => ({ name, text: fs.readFileSync(path.join(DIR, name), 'utf8').replace(/\r\n/g, '\n') }))
  : [];
// Comment lines explain the rules and may name what is forbidden.
const code = (text) =>
  text
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

test('the gate runs on GitHub for every pull request and for main', () => {
  const gate = workflows.find((workflow) => workflow.name === 'gate.yml');
  assert.ok(gate, '.github/workflows/gate.yml is missing');
  const text = code(gate.text);
  assert.match(text, /^on:\n(?:.*\n)*?\s+pull_request:/m);
  assert.match(text, /push:\n\s+branches: \[main\]/);
  assert.match(text, /run: npm run gate\s*$/m);
  assert.match(text, /npm ci\n/, 'installs from package-lock.json');
  assert.doesNotMatch(text, /npm install\b|--no-verify/);
});

test('the browser tests run on GitHub too, with the browser of the pinned Playwright version', () => {
  const text = code(workflows.find((workflow) => workflow.name === 'gate.yml').text);
  assert.match(text, /npx playwright install --with-deps chromium\n/);
  assert.match(text, /run: npm run test:browser\s*$/m);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const name of ['@playwright/test', 'playwright-core', '@axe-core/playwright']) {
    assert.match(pkg.devDependencies[name], /^\d+\.\d+\.\d+$/, `${name} must be pinned to one exact version`);
  }
  assert.equal(pkg.devDependencies['playwright-core'], pkg.devDependencies['@playwright/test'], 'one Playwright version, one browser');
});

test('every action is one of GitHub and pinned to a commit', () => {
  for (const { name, text } of workflows) {
    const uses = [...code(text).matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)].map((match) => match[1]);
    assert.ok(uses.length > 0, `${name}: no action found`);
    for (const action of uses) {
      assert.match(
        action,
        /^actions\/[\w-]+@[0-9a-f]{40}$/,
        `${name}: ${action} - use an action of GitHub ("actions/...") pinned to a full commit id`,
      );
    }
  }
});

test('the token only reads, no secret is used, no workflow runs on pull_request_target', () => {
  for (const { name, text } of workflows) {
    const body = code(text);
    assert.match(
      body,
      /^permissions:\n[ \t]+contents: read\n(?![ \t]+\w)/m,
      `${name}: top-level permissions must be "contents: read" only`,
    );
    assert.doesNotMatch(body, /pull_request_target/, `${name}: pull_request_target runs foreign code with a writable token`);
    assert.doesNotMatch(body, /\$\{\{\s*secrets\./, `${name}: uses a secret`);
    assert.doesNotMatch(body, /^[ \t]+permissions:/m, `${name}: a job widens the permissions`);
    assert.match(body, /persist-credentials: false/, `${name}: the checkout must not leave the token in .git/config`);
  }
});

test('Dependabot watches npm and the pinned actions, and proposes no major version', () => {
  const dependabot = fs.readFileSync(path.join(ROOT, '.github', 'dependabot.yml'), 'utf8');
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /version-update:semver-major/);
});
