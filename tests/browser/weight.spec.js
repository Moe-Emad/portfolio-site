// Speed (tracker F5, F52): pictures in a modern format and in the size of the screen, and a budget for what the site
// may weigh. The budgets are a little above today's figures (docs/page-weight.md): they catch a change that makes
// a page much heavier, not every extra byte.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import zlib from 'node:zlib';
import { expect, test } from '@playwright/test';
import { pictureVersion } from '../../tools/build/picture-versions.mjs';

const { measurePage } = createRequire(import.meta.url)('../../tools/dev/page-weight.cjs');
const BUILD = process.env.E2E_BUILD;
const gzip = (file) => zlib.gzipSync(fs.readFileSync(file)).length;
const assets = fs.readdirSync(path.join(BUILD, 'assets')).map((name) => path.join(BUILD, 'assets', name));
const kB = 1024;

const projectFiles = fs
  .readdirSync('content/projects')
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')));
const shownProjects = projectFiles.filter((project) => project.draft !== true);

/** The longest run of plain letters, digits and spaces in a text: written the same way in the JavaScript. */
const plain = (text) => (text.match(/[A-Za-z0-9 ]+/g) ?? []).map((run) => run.trim()).reduce((a, b) => (b.length > a.length ? b : a), '');
/** The text of a project's own page: its paragraphs and the text of its points. */
const pageText = (project) => [...project.description, ...project.highlights.map((point) => point.text)].map(plain).filter((run) => run.length >= 20);

/** The script every page loads, as index.html names it. */
const mainScript = () => {
  const src = /<script type="module"[^>]*src="([^"]+)"/.exec(fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8'))[1];
  return path.join(BUILD, src);
};

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

test('the JavaScript one page can load and the CSS stay inside their budgets', () => {
  // Every script but the project files, plus the largest project file: a project page loads only its own (F53).
  const scripts = assets.filter((file) => file.endsWith('.js'));
  const projects = scripts.filter((file) => path.basename(file).startsWith('project-'));
  const shared = scripts.filter((file) => !projects.includes(file)).reduce((sum, file) => sum + gzip(file), 0);
  const js = shared + Math.max(0, ...projects.map(gzip));
  const css = assets.filter((file) => file.endsWith('.css')).reduce((sum, file) => sum + gzip(file), 0);
  expect(js, `JavaScript, compressed: ${(js / kB).toFixed(0)} kB`).toBeLessThan(95 * kB);
  expect(css, `CSS, compressed: ${(css / kB).toFixed(0)} kB`).toBeLessThan(12 * kB);
});

test('the script of every page holds the card of each project, not the text of its page', () => {
  // Tracker F53. The list of work, the palette and the link to the next project need a project's card; its
  // paragraphs, its points and its pictures are loaded by its own page only. A draft is not carried at all.
  const code = fs.readFileSync(mainScript(), 'utf8');
  let checked = 0;
  for (const project of projectFiles) {
    for (const text of pageText(project)) {
      expect(code.includes(text), `${project.slug}: "${text}" is in the script of every page`).toBe(false);
      checked += 1;
    }
    const summary = plain(project.summary);
    expect(code.includes(summary), `${project.slug}: "${summary}"`).toBe(project.draft !== true);
  }
  expect(checked, 'texts looked for').toBeGreaterThan(30);
});

test('no script of the build holds anything of a draft', () => {
  // Tracker F17, F53: a draft stays in content/ and is checked, but the site sends nothing of it.
  const drafts = projectFiles.filter((project) => project.draft === true);
  expect(drafts.length, 'drafts in content/projects').toBeGreaterThan(0);
  for (const file of assets.filter((name) => name.endsWith('.js'))) {
    const code = fs.readFileSync(file, 'utf8');
    for (const draft of drafts) {
      for (const text of [plain(draft.summary), ...pageText(draft)]) {
        expect(code.includes(text), `${path.basename(file)} holds "${text}" of the draft ${draft.slug}`).toBe(false);
      }
    }
  }
});

test('the home page loads no project file; a project page loads its own, named in its head', async ({ page }) => {
  // Tracker F53. The head names the file, so that the browser fetches it together with the script of the page.
  // The scripts are read from the build by their address: a second visit gets "304 Not Modified" without a body.
  const scripts = new Set();
  page.on('response', (response) => {
    const address = new URL(response.url()).pathname;
    if (address.endsWith('.js')) scripts.add(address);
  });
  const loaded = async () => {
    await page.waitForLoadState('networkidle');
    const entries = [...scripts].map((address) => [address, fs.readFileSync(path.join(BUILD, address), 'utf8')]);
    scripts.clear();
    return entries;
  };
  const holding = (entries, project) => entries.filter(([, text]) => pageText(project).some((run) => text.includes(run))).map(([address]) => address);

  await page.goto('/');
  const home = await loaded();
  for (const project of shownProjects) expect(holding(home, project), `the home page loads the text of ${project.slug}`).toEqual([]);

  for (const project of shownProjects) {
    await page.goto(`/work/${project.slug}/`);
    const entries = await loaded();
    const own = holding(entries, project);
    expect(own, `/work/${project.slug}/ loads its text in a file of its own`).toHaveLength(1);
    expect(path.basename(own[0])).toMatch(/^project-/);
    for (const other of shownProjects.filter((each) => each !== project)) {
      expect(holding(entries, other), `/work/${project.slug}/ loads the text of ${other.slug}`).toEqual([]);
    }
    const named = await page.locator('head link[rel="modulepreload"]').evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
    expect(named, `the head of /work/${project.slug}/`).toContain(own[0]);
  }
});

test('the browser is not sent the check of the content: the build has made it', () => {
  // Tracker F51. The build draws every page with the content and stops on a broken file, and the unit tests check
  // every file again. In the browser of a visitor the check could only repeat a known result, at the cost of
  // about 2.5 kB of the JavaScript budget.
  const code = assets
    .filter((file) => file.endsWith('.js'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  for (const message of ['The content has', 'must be a text that is not empty', 'must be one of: ']) {
    expect(code.includes(message), `the JavaScript holds "${message}"`).toBe(false);
  }
});

test('no page sends more than 12 kB of HTML, compressed', () => {
  for (const file of files(BUILD).filter((name) => name.endsWith('.html'))) {
    expect(gzip(file), path.relative(BUILD, file)).toBeLessThan(12 * kB);
  }
});

test('no picture is heavier than 350 kB, and no AVIF or WebP copy heavier than 160 kB', () => {
  for (const file of files(path.join(BUILD, 'images'))) {
    const size = fs.statSync(file).size;
    const limit = /\.(avif|webp)$/.test(file) ? 160 : 350;
    expect(size, `${path.relative(BUILD, file)}: ${(size / kB).toFixed(0)} kB`).toBeLessThan(limit * kB);
  }
});

test('every picture offers its AVIF copies first, then WebP, then the original', async ({ page }) => {
  // Tracker F52. A browser takes the first <source> whose type it can show; one without AVIF takes the WebP copies.
  for (const address of ['/', '/work/rplms-v2/']) {
    await page.goto(address);
    const pictures = await page.locator('picture').evaluateAll((elements) =>
      elements.map((element) => ({
        types: [...element.querySelectorAll('source')].map((source) => source.type),
        avif: element.querySelector('source')?.getAttribute('srcset') ?? '',
        src: element.querySelector('img')?.getAttribute('src') ?? '',
      })),
    );
    expect(pictures.length, `pictures on ${address}`).toBeGreaterThan(0);
    for (const picture of pictures) {
      expect(picture.types, picture.src).toEqual(['image/avif', 'image/webp']);
      expect(picture.avif, picture.src).toMatch(/^(\S+\.avif\?v=[0-9a-f]{8} \d+w)(, \S+\.avif\?v=[0-9a-f]{8} \d+w)*$/);
      expect(picture.src, 'the fallback is the original').toMatch(/\.(jpe?g|png)\?v=[0-9a-f]{8}$/);
    }
  }
});

test('every address of a picture carries the fingerprint of its files', async ({ page }) => {
  // Tracker F54. The fingerprint changes when the picture or one of its copies does, so the address changes with it
  // and a browser may keep a picture for a year without ever showing an old one.
  const images = new Map(projectFiles.flatMap((project) => project.images.map((image) => [image.src, image])));
  for (const address of ['/', '/work/rplms-v2/', '/work/relic/']) {
    await page.goto(address);
    const pictures = await page.locator('picture').evaluateAll((elements) =>
      elements.map((element) => ({
        img: element.querySelector('img').getAttribute('src'),
        sources: [...element.querySelectorAll('source')].flatMap((source) => source.getAttribute('srcset').split(', ').map((entry) => entry.split(' ')[0])),
      })),
    );
    expect(pictures.length, `pictures on ${address}`).toBeGreaterThan(0);
    for (const picture of pictures) {
      const [src, query] = picture.img.split('?');
      const image = images.get(src);
      expect(image, `${src} is a picture of content/projects`).toBeTruthy();
      const version = pictureVersion('public', image);
      expect(query, src).toBe(`v=${version}`);
      for (const copy of picture.sources) expect(copy, `a copy of ${src}`).toMatch(new RegExp(`\\?v=${version}$`));
    }
  }
});

test('every page names the fonts of its first view in its head, and uses each of them once', async ({ page }) => {
  // Tracker F55. The browser fetches them together with the stylesheet, instead of finding them in it later. A
  // font named but not used, or fetched twice (a "crossorigin" that does not match), would only cost bytes.
  for (const address of ['/', '/work/', '/work/relic/']) {
    await page.goto(address);
    const named = await page
      .locator('head link[rel="preload"][as="font"]')
      .evaluateAll((links) => links.map((link) => ({ file: new URL(link.href).pathname, type: link.type, cors: link.crossOrigin })));
    expect(
      named.map((font) => path.basename(font.file).replace(/-[\w-]{8}\.woff2$/, '')),
      `the fonts named in the head of ${address}`,
    ).toEqual(['rakkas-latin-400-normal', 'readex-pro-latin-wght-normal']);
    await page.evaluate(() => document.fonts.ready);
    const fetched = await page.evaluate(() =>
      performance.getEntriesByType('resource').filter((entry) => /\.woff2$/.test(entry.name)).map((entry) => new URL(entry.name).pathname),
    );
    for (const font of named) {
      expect(font.type, font.file).toBe('font/woff2');
      expect(font.cors, font.file).toBe('anonymous');
      expect(fetched.filter((file) => file === font.file), `${font.file} on ${address}`).toHaveLength(1);
    }
  }
});

/** The faces of Rakkas in the stylesheet of the page: { range, file } with the file below the build folder. */
const rakkasFaces = (page) =>
  page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule) => rule instanceof CSSFontFaceRule && rule.style.getPropertyValue('font-family').replace(/["']/g, '') === 'Rakkas')
      .map((rule) => ({ range: rule.style.getPropertyValue('unicode-range'), file: new URL(/url\("?([^")]+)"?\)/.exec(rule.style.getPropertyValue('src'))[1], location.href).pathname })),
  );

/** Whether a unicode-range ("U+600-6FF, U+200C") holds a character. */
const inRange = (range, code) =>
  range.split(',').some((part) => {
    const [low, high] = part.trim().replace(/^U\+/i, '').split('-');
    return code >= parseInt(low, 16) && code <= parseInt(high ?? low, 16);
  });

const WHOLE_ARABIC = 'node_modules/@fontsource/rakkas/files/rakkas-arabic-400-normal.woff2';

test('each face of Rakkas has the range of its letters, and the Arabic file holds only the letters the site shows', async ({ page }) => {
  // Tracker F56. Without a range a face counts for every character: the browser fetched the Arabic file for the
  // Latin name in the bar, before the Latin one. The Arabic file was the whole of it, for ten letters.
  await page.goto('/');
  const faces = await rakkasFaces(page);
  for (const face of faces) expect(face.range, `the face of ${face.file}`).not.toBe('');
  const arabic = faces.filter((face) => inRange(face.range, 0x0645));
  const latin = faces.filter((face) => inRange(face.range, 0x0041));
  expect(arabic, 'faces for the letter م').toHaveLength(1);
  expect(latin, 'faces for the letter A').toHaveLength(1);
  expect(arabic[0].file).not.toBe(latin[0].file);
  const size = fs.statSync(path.join(BUILD, arabic[0].file)).size;
  expect(size, `${arabic[0].file}: ${size} B`).toBeLessThan(fs.statSync(WHOLE_ARABIC).size / 3);
});

test('every Arabic text of the site looks the same with the Arabic file of the build as with the whole font', async ({ page }) => {
  // Tracker F56. An Arabic letter changes its shape with its neighbours: the cut-down file must keep every form.
  // Both are drawn with the faces of Rakkas as the stylesheet of the site declares them, only the Arabic file
  // differs: the space between two Arabic words comes from the Latin face there, by its range.
  await page.goto('/');
  const faces = await rakkasFaces(page);
  const [arabic] = faces.filter((face) => inRange(face.range, 0x0645));
  const texts = [
    ...new Set(
      ['content/profile.json', ...projectFiles.map((project) => `content/projects/${project.slug}.json`)].flatMap((file) =>
        Object.values(JSON.parse(fs.readFileSync(file, 'utf8'))).filter((value) => typeof value === 'string' && /[؀-ۿ]/.test(value)),
      ),
    ),
  ];
  expect(texts.length, 'Arabic texts in the content').toBeGreaterThan(1);
  // A blank page: the policy of the site allows fonts from the site only, and these come as data.
  await page.goto('about:blank');
  const family = (name, arabicFile) =>
    faces
      .map((face) => {
        const file = face === arabic ? arabicFile : path.join(BUILD, face.file);
        return `@font-face { font-family: '${name}'; src: url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format('woff2'); unicode-range: ${face.range}; }`;
      })
      .join(' ');
  await page.setContent(
    `<style>${family('Whole', WHOLE_ARABIC)} ${family('Site', path.join(BUILD, arabic.file))} body { margin: 0; background: #fff; }
      p { font-size: 56px; margin: 0; padding: 8px; line-height: 1.5; width: 600px; }</style>
     <p dir="rtl" lang="ar"></p>`,
  );
  // One element at one place for both: on a phone screen a pixel of the page is 2.625 real pixels, so text half a
  // real pixel lower would be smoothed differently.
  const draw = async (fontFamily, text) => {
    await page.locator('p').evaluate((element, [name, words]) => {
      element.style.fontFamily = `'${name}', monospace`;
      element.textContent = words;
    }, [fontFamily, text]);
    // Loads every face of the family that the text needs; document.fonts.ready alone resolves before a load starts.
    await page.evaluate(([name, words]) => document.fonts.load(`56px '${name}'`, words), [fontFamily, text]);
    return page.locator('p').screenshot();
  };
  for (const text of texts) {
    const whole = await draw('Whole', text);
    // The fonts are really in use: the stand-in typeface draws the text differently.
    expect(Buffer.compare(whole, await draw('No such font', text)), `"${text}" with the whole font is drawn by a stand-in`).not.toBe(0);
    expect(Buffer.compare(whole, await draw('Site', text)), `"${text}" is drawn differently`).toBe(0);
  }
});

test('the pictures may be kept by the browser for a year: their addresses change with them', () => {
  // Tracker F54. Before, every visit asked the host about every picture again.
  const headers = fs.readFileSync(path.join(BUILD, '_headers'), 'utf8');
  expect(headers).toMatch(/\/images\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
});

test('the browser is given an AVIF copy that fits the screen, not the full picture', async ({ page }, testInfo) => {
  await page.goto('/work/jpro-website/');
  const cover = page.locator('.case__cover img');
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);

  const used = await cover.evaluate((image) => ({ src: new URL(image.currentSrc).pathname, width: image.naturalWidth }));
  expect(used.src, 'the copy the browser chose').toMatch(/\.avif$/);
  const response = await page.request.get(used.src);
  expect(response.headers()['content-type'], `${used.src} is sent as an AVIF picture`).toBe('image/avif');
  if (testInfo.project.name === 'phone') {
    // A phone screen is at most 1100 pixels wide in real pixels: the 1440 pixel picture is not needed.
    expect(used.width, `${used.src} is ${used.width} pixels wide`).toBeLessThanOrEqual(1100);
  }
});

test('on a sharp desktop screen the cover is loaded as wide as its pixels; an ordinary one keeps the 1,440 px copy', async ({ browser }) => {
  // Tracker F58. Two pixels per point, as on most laptops: the cover of the Jpro page, about 1,150 points wide, needs
  // about 2,300 pixels. Taken at 1,440 px it was enlarged and soft.
  const loaded = async (deviceScaleFactor) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor });
    const page = await context.newPage();
    await page.goto('/work/jpro-website/');
    const cover = page.locator('.case__cover img');
    await expect.poll(() => cover.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    const found = await cover.evaluate(async (image) => {
      const copy = new Image();
      copy.src = image.currentSrc;
      await copy.decode();
      return { file: new URL(image.currentSrc).pathname, width: copy.naturalWidth, shown: image.getBoundingClientRect().width };
    });
    await context.close();
    return found;
  };
  const sharp = await loaded(2);
  expect(sharp.width, `${sharp.file} for ${Math.round(sharp.shown)} points at two pixels each`).toBeGreaterThanOrEqual(Math.floor(sharp.shown * 2));
  const ordinary = await loaded(1);
  expect(ordinary.width, `${ordinary.file} on an ordinary screen`).toBe(1440);
});

test('pictures below the first screen wait until they are needed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  const loading = await page.locator('#work img').evaluateAll((images) => images.map((image) => image.loading));
  expect(loading.length).toBeGreaterThan(0);
  expect(new Set(loading)).toEqual(new Set(['lazy']));

  // On a project page the cover is the first thing to see: it loads at once, the gallery waits.
  await page.goto('/work/jpro-website/');
  await expect(page.locator('.case__cover img')).toHaveAttribute('loading', 'eager');
  const gallery = await page.locator('.gallery img').evaluateAll((images) => images.map((image) => image.loading));
  expect(new Set(gallery)).toEqual(new Set(['lazy']));
});

test('npm run weight counts every picture of the page, also when the pictures are slow', async ({ page }) => {
  // Tracker B12. The tool counted four of the seven pictures of the home page on a desktop and three on a phone:
  // it never got far enough down to load the others. Every picture is held back for a moment here, as on a slow
  // connection, so that a walk that does not wait for them is caught on every run.
  await page.route(/\.(avif|webp|jpe?g|png)$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  const measured = await measurePage(page, '/');

  const shown = await page.locator('img').evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute('src'),
      loaded: image.complete && image.naturalWidth > 0 ? new URL(image.currentSrc).pathname : null,
    })),
  );
  expect(shown.length, 'pictures on the home page').toBeGreaterThan(5);
  for (const picture of shown) {
    expect(picture.loaded, `${picture.src} has loaded`).not.toBeNull();
    expect(measured.pictures, `${picture.src} is counted`).toContain(picture.loaded);
  }
});

test('the files with a changing name may be kept by the browser for a year', () => {
  const headers = fs.readFileSync(path.join(BUILD, '_headers'), 'utf8');
  expect(headers).toMatch(/\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  // Every file in assets/ carries a hash of its content in its name.
  for (const file of assets) expect(path.basename(file)).toMatch(/-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/);
});
