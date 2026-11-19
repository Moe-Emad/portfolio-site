'use strict';
// Tests of the page template of the build (tools/build/build.mjs, tracker F4).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE = [
  '<head>',
  '<meta charset="UTF-8" />',
  '<!--page-head-start-->',
  '<title>Default</title>',
  '<!--page-head-end-->',
  '</head>',
  '<body><div id="root"></div><script type="module" src="/assets/app.js"></script></body>',
].join('\n');

// B7: the build machine of Vercel sets npm_config_cache_dir, a setting npm 11 does not know, so every start of npm
// there prints 'npm warn Unknown env config "cache-dir"'. The build starts Vite without npm, so it prints none.
test('Vite starts without npm, so npm settings of the host print no warnings', async () => {
  const { vite } = await import('./build.mjs');
  const env = { ...process.env, npm_config_cache_dir: path.join(os.tmpdir(), 'b7-npm-cache-dir') };
  const result = vite(['--version'], { stdio: 'pipe', encoding: 'utf8', env });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /vite\/\d/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /npm warn/i);
});

test('a page gets its own head and its HTML inside the root element', async () => {
  const { fillTemplate } = await import('./build.mjs');
  const html = fillTemplate(TEMPLATE, { path: '/work/relic/', head: '<title>Relic</title>', app: '<main>Relic</main>' });
  assert.match(html, /<title>Relic<\/title>/);
  assert.doesNotMatch(html, /Default|page-head-start|page-head-end/);
  assert.match(html, /<div id="root" data-path="\/work\/relic\/"><main>Relic<\/main><\/div>/);
  assert.match(html, /<meta charset="UTF-8" \/>/, 'the rest of the head stays');
  assert.match(html, /src="\/assets\/app\.js"/, 'the script stays');
});

test('a template without the markers or the root element stops the build', async () => {
  const { fillTemplate } = await import('./build.mjs');
  const page = { path: '/', head: '', app: '' };
  assert.throws(() => fillTemplate('<head></head><body><div id="root"></div></body>', page), /markers/);
  assert.throws(() => fillTemplate(TEMPLATE.replace('<div id="root"></div>', '<div id="app"></div>'), page), /root/);
});

test('index.html has the markers, the root element and the theme script', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<!--page-head-start-->[\s\S]*<title>[\s\S]*<!--page-head-end-->/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /document\.documentElement\.dataset\.theme = theme/);
});

test('npm run build is the build that writes the pages', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.build, 'node tools/build/build.mjs');
});
