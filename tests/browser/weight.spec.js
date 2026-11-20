// Speed (tracker F5): pictures in a modern format and in the size of the screen, and a budget for what the site
// may weigh. The budgets are a little above today's figures (docs/page-weight.md): they catch a change that makes
// a page much heavier, not every extra byte.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import zlib from 'node:zlib';
import { expect, test } from '@playwright/test';

const { measurePage } = createRequire(import.meta.url)('../../tools/dev/page-weight.cjs');
const BUILD = process.env.E2E_BUILD;
const gzip = (file) => zlib.gzipSync(fs.readFileSync(file)).length;
const assets = fs.readdirSync(path.join(BUILD, 'assets')).map((name) => path.join(BUILD, 'assets', name));
const kB = 1024;

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

test('the JavaScript and the CSS stay inside their budgets', () => {
  const scripts = assets.filter((file) => file.endsWith('.js'));
  const styles = assets.filter((file) => file.endsWith('.css'));
  const js = scripts.reduce((sum, file) => sum + gzip(file), 0);
  const css = styles.reduce((sum, file) => sum + gzip(file), 0);
  expect(js, `JavaScript, compressed: ${(js / kB).toFixed(0)} kB`).toBeLessThan(95 * kB);
  expect(css, `CSS, compressed: ${(css / kB).toFixed(0)} kB`).toBeLessThan(12 * kB);
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

test('no picture is heavier than 350 kB, and no WebP copy heavier than 160 kB', () => {
  for (const file of files(path.join(BUILD, 'images'))) {
    const size = fs.statSync(file).size;
    const limit = file.endsWith('.webp') ? 160 : 350;
    expect(size, `${path.relative(BUILD, file)}: ${(size / kB).toFixed(0)} kB`).toBeLessThan(limit * kB);
  }
});

test('the browser is given a WebP copy that fits the screen, not the full picture', async ({ page }, testInfo) => {
  await page.goto('/work/jpro-website/');
  const cover = page.locator('.case__cover img');
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);

  const used = await cover.evaluate((image) => ({ src: new URL(image.currentSrc).pathname, width: image.naturalWidth }));
  expect(used.src, 'the copy the browser chose').toMatch(/\.webp$/);
  if (testInfo.project.name === 'phone') {
    // A phone screen is at most 1100 pixels wide in real pixels: the 1440 pixel picture is not needed.
    expect(used.width, `${used.src} is ${used.width} pixels wide`).toBeLessThanOrEqual(1100);
  }
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
  await page.route(/\.(webp|jpe?g|png)$/, async (route) => {
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
