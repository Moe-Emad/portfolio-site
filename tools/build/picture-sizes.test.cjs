'use strict';
// Tests of the picture sizes (tools/build/picture-sizes.cjs, tracker F6).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fillSizes, pictureSize, writeCopies } = require('./picture-sizes.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

/** The first bytes of a PNG of the given size (signature and IHDR are all the reader needs). */
function pngHeader(width, height) {
  const buffer = Buffer.alloc(33);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.writeUInt32BE(0x0d0a1a0a, 4);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

test('the size of a PNG and of a JPEG is read from the file', async () => {
  assert.deepEqual(pictureSize(pngHeader(640, 480)), { width: 640, height: 480 });
  assert.deepEqual(pictureSize(fs.readFileSync(path.join(ROOT, 'public', 'og-image.png'))), { width: 1200, height: 630 });
  // A screenshot of the repo, compared with what sharp reads: the screenshots are retaken now and then (F58).
  const jpeg = fs.readFileSync(path.join(ROOT, 'public', 'images', 'projects', 'jpro-website', '01-home.jpg'));
  const { width, height } = await require('sharp')(jpeg).metadata();
  assert.deepEqual(pictureSize(jpeg), { width, height });
});

test('a file that is not a picture is refused', () => {
  assert.throws(() => pictureSize(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), /not a JPEG, PNG or WebP/);
});

test('missing and wrong sizes are written into the project file, right ones are left alone', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-pictures-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'content', 'projects'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public', 'images'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'images', 'a.png'), pngHeader(800, 600));
  fs.writeFileSync(path.join(root, 'public', 'images', 'b.png'), pngHeader(390, 844));
  const file = path.join(root, 'content', 'projects', 'demo.json');
  fs.writeFileSync(
    file,
    JSON.stringify({
      slug: 'demo',
      images: [
        { src: '/images/a.png', alt: 'A' },
        { src: '/images/b.png', alt: 'B', width: 390, height: 844 },
        { src: '/images/missing.png', alt: 'C' },
      ],
    }),
  );

  const lines = fillSizes(root);
  assert.deepEqual(lines, ['demo.json: /images/a.png is 800 x 600', 'demo.json: /images/missing.png does not exist in public/']);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.images[0], { src: '/images/a.png', alt: 'A', width: 800, height: 600 });
  assert.equal(fillSizes(root).length, 1, 'a second run changes nothing; only the missing file is named');
});

test('every copy is made in AVIF and in WebP, and a second run leaves them alone', async (t) => {
  // Tracker F52. A picture 700 px wide gets a 640 px copy and one at full width, in each format.
  const sharp = require('sharp');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-copies-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'content', 'projects'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public', 'images'), { recursive: true });
  await sharp({ create: { width: 700, height: 400, channels: 3, background: '#1a3fa6' } })
    .jpeg()
    .toFile(path.join(root, 'public', 'images', 'a.jpg'));
  fs.writeFileSync(
    path.join(root, 'content', 'projects', 'demo.json'),
    JSON.stringify({ slug: 'demo', images: [{ src: '/images/a.jpg', alt: 'A', width: 700, height: 400 }] }),
  );

  const written = await writeCopies(root);
  const names = ['a-640.avif', 'a.avif', 'a-640.webp', 'a.webp'];
  assert.deepEqual(written.map((line) => line.split(' ')[0]).sort(), names.map((name) => `/images/${name}`).sort());
  for (const name of names) {
    const file = fs.readFileSync(path.join(root, 'public', 'images', name));
    const kind = name.endsWith('.avif') ? file.toString('ascii', 4, 12) : file.toString('ascii', 8, 12);
    assert.equal(kind, name.endsWith('.avif') ? 'ftypavif' : 'WEBP', `${name} is not the format its name says`);
    const { width } = await sharp(file).metadata();
    assert.equal(width, name.includes('-640') ? 640 : 700, `${name} has the wrong width`);
  }
  assert.deepEqual(await writeCopies(root), [], 'a second run writes nothing');
});

test('the sizes in the project files of this repo are right', () => {
  for (const name of fs.readdirSync(path.join(ROOT, 'content', 'projects'))) {
    const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'projects', name), 'utf8'));
    for (const image of project.images) {
      const size = pictureSize(fs.readFileSync(path.join(ROOT, 'public', image.src)));
      assert.deepEqual({ width: image.width, height: image.height }, size, `${name}: ${image.src}`);
    }
  }
});
