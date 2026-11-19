'use strict';
// The settings of the admin panel stay in step with the content (tools/build/pages-cms.cjs, tracker F6).
// Pages CMS saves only the fields its settings name, so a field that is missing there would silently disappear
// from a content file the next time someone saves it in the panel.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONFIG, configYaml, missingFields, toYaml } = require('./pages-cms.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

test('.pages.yml is the output of "npm run cms-config"', () => {
  const file = fs.readFileSync(path.join(ROOT, '.pages.yml'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(file, configYaml(), 'run "npm run cms-config" and commit .pages.yml');
});

test('every content file has an entry in the settings', () => {
  const paths = CONFIG.content.map((entry) => entry.path);
  for (const name of fs.readdirSync(path.join(ROOT, 'content'))) {
    const expected = name.endsWith('.json') ? `content/${name}` : `content/${name}`;
    assert.ok(paths.includes(expected), `${expected} cannot be edited in the admin panel`);
  }
});

test('every field of every content file is named in the settings', () => {
  const missing = [];
  for (const entry of CONFIG.content) {
    const full = path.join(ROOT, entry.path);
    const files = entry.type === 'collection' ? fs.readdirSync(full).map((name) => `${entry.path}/${name}`) : [entry.path];
    for (const file of files) {
      const value = readJson(file);
      for (const item of Array.isArray(value) ? value : [value]) {
        for (const field of missingFields(item, entry.fields)) missing.push(`${file}: ${field}`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'fields the admin panel would drop on save');
});

test('a field that the settings do not name is found, also inside lists and objects', () => {
  const fields = [
    { name: 'title', type: 'string' },
    { name: 'links', type: 'object', fields: [{ name: 'live', type: 'string' }] },
    { name: 'images', type: 'object', list: true, fields: [{ name: 'src', type: 'image' }] },
  ];
  const value = { title: 'A', extra: 1, links: { live: 'x', repo: 'y' }, images: [{ src: '/a.jpg' }, { src: '/b.jpg', credit: 'me' }] };
  assert.deepEqual(missingFields(value, fields), ['extra', 'links.repo', 'images.credit']);
  assert.deepEqual(missingFields({ title: 'A', links: {}, images: [] }, fields), []);
});

test('the choices of the panel are the ones the schema accepts', () => {
  const schema = fs.readFileSync(path.join(ROOT, 'src', 'content', 'schema.ts'), 'utf8');
  const list = (name) => JSON.parse(new RegExp(`const ${name} = (\\[[^\\]]+\\]);`).exec(schema)[1].replace(/'/g, '"'));
  const projects = CONFIG.content.find((entry) => entry.name === 'projects');
  const values = (name) => projects.fields.find((field) => field.name === name).options.values;
  assert.deepEqual(values('kind'), list('KINDS'));
  assert.deepEqual(values('status'), list('STATUSES'));
});

test('the YAML writer handles maps, lists of maps and lists of plain values', () => {
  const yaml = toYaml({ name: 'a "b"', list: [{ x: 1, y: [1, 2] }, { x: 2 }], flags: ['p', 'q'], on: true });
  assert.equal(
    yaml,
    ['name: "a \\"b\\""', 'list:', '  - x: 1', '    y: [1, 2]', '  - x: 2', 'flags: ["p", "q"]', 'on: true'].join('\n'),
  );
});

test('the panel is described for the owner, and no admin page is added to the public site', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'admin.md')), 'docs/admin.md is missing');
  assert.ok(!fs.existsSync(path.join(ROOT, 'public', 'admin')), 'public/admin would put a sign-in page on the public site');
});
