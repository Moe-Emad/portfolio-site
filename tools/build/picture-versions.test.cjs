'use strict';
// Tests of the fingerprints of the pictures (tools/build/picture-versions.mjs, tracker F54).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const load = () => import('./picture-versions.mjs');

/** A public/ folder with one picture 700 px wide and its four copies; returns its path. */
function sampleFolder(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-versions-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['a.jpg', 'a-640.avif', 'a.avif', 'a-640.webp', 'a.webp']) fs.writeFileSync(path.join(dir, name), `bytes of ${name}`);
  return dir;
}

test('the fingerprint is eight hex characters and stays the same while the files do', async (t) => {
  const { pictureVersion } = await load();
  const dir = sampleFolder(t);
  const image = { src: '/a.jpg', width: 700 };
  const version = pictureVersion(dir, image);
  assert.match(version, /^[0-9a-f]{8}$/);
  assert.equal(pictureVersion(dir, image), version);
});

test('the fingerprint changes when the picture or any of its copies changes', async (t) => {
  const { pictureVersion } = await load();
  const dir = sampleFolder(t);
  const image = { src: '/a.jpg', width: 700 };
  const seen = new Set([pictureVersion(dir, image)]);
  for (const name of ['a.jpg', 'a-640.avif', 'a.webp']) {
    fs.appendFileSync(path.join(dir, name), ' changed');
    const version = pictureVersion(dir, image);
    assert.ok(!seen.has(version), `${name} changed, the fingerprint did not`);
    seen.add(version);
  }
});

test('a project gets the fingerprint of each picture and keeps everything else', async (t) => {
  const { pictureVersion, withPictureVersions } = await load();
  const dir = sampleFolder(t);
  const project = { slug: 'demo', title: 'Demo', images: [{ src: '/a.jpg', alt: 'A', width: 700, height: 400 }] };
  assert.deepEqual(withPictureVersions(project, dir), {
    slug: 'demo',
    title: 'Demo',
    images: [{ src: '/a.jpg', alt: 'A', width: 700, height: 400, version: pictureVersion(dir, project.images[0]) }],
  });
  assert.deepEqual(project.images[0].version, undefined, 'the project read from the file is left as it was');
  // A file of the wrong shape is passed on as it is: the content check names its problem.
  assert.deepEqual(withPictureVersions({ slug: 'x', images: 'none' }, dir), { slug: 'x', images: 'none' });
});

test('every picture of this repo has a fingerprint of its own', async () => {
  const { pictureVersion } = await load();
  const versions = new Map();
  for (const name of fs.readdirSync(path.join(ROOT, 'content', 'projects'))) {
    const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'projects', name), 'utf8'));
    for (const image of project.images) versions.set(image.src, pictureVersion(path.join(ROOT, 'public'), image));
  }
  assert.ok(versions.size > 40, 'pictures in content/projects');
  assert.equal(new Set(versions.values()).size, versions.size, 'two pictures share a fingerprint');
});
