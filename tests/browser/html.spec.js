// Pages as real HTML (tracker F4): what the server sends before any JavaScript runs, and what search engines
// and link previews read. The first tests read the files of the build; the last ones use a browser.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const BUILD = process.env.E2E_BUILD;
const SITE = process.env.E2E_SITE_URL;
const profile = JSON.parse(fs.readFileSync('content/profile.json', 'utf8'));
const projects = fs
  .readdirSync('content/projects')
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
  // A draft is left out of the site (tracker F17).
  .filter((project) => project.draft !== true);

const pages = [
  { address: '/', file: 'index.html', title: `${profile.name} - ${profile.role}`, text: [profile.name, profile.nameArabic, profile.headline, 'Selected work', projects[0].summary] },
  // The list of work (tracker B6).
  { address: '/work/', file: 'work/index.html', title: `Work - ${profile.name}`, text: ['Selected work', 'Smaller and earlier work', projects[0].title] },
  ...projects.map((project) => ({
    address: `/work/${project.slug}/`,
    file: `work/${project.slug}/index.html`,
    title: `${project.title} - ${profile.name}`,
    text: [project.title, project.summary, project.highlights[0].title, project.role],
  })),
];

const read = (file) => fs.readFileSync(path.join(BUILD, file), 'utf8');
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** The value of a tag in the head: meta('property', 'og:title') or meta('name', 'description'). */
const meta = (html, attribute, name) => new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`).exec(html)?.[1];
/** The text of the page: what is left of the app's HTML without tags. React writes "'" as &#x27;. */
const visibleText = (html) =>
  html
    .slice(html.indexOf('<div id="root"'))
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

// The dev server shows the head of index.html as it is; the build replaces it with each page's own head. The home
// page must be described the same way in both, so a new headline is never left half changed (tracker F26).
test('the description in index.html is the one the build writes for the home page', () => {
  const template = fs.readFileSync('index.html', 'utf8');
  const kept = /<!--page-head-start-->[\s\S]*?name="description"\s+content="([^"]*)"/.exec(template)?.[1];
  expect(kept, 'a description between the markers of index.html').toBeTruthy();
  expect(kept).toBe(meta(read('index.html'), 'name', 'description'));
});

for (const page of pages) {
  test.describe(`the HTML file of ${page.address}`, () => {
    test('contains the text of the page without JavaScript', () => {
      const text = visibleText(read(page.file));
      for (const expected of page.text) expect(text, `"${expected.slice(0, 50)}"`).toContain(expected);
    });

    test('has its own title, description, kept address and link preview', () => {
      const html = read(page.file);
      expect(html.match(/<title>/g), 'exactly one title').toHaveLength(1);
      expect(html).toContain(`<title>${escapeHtml(page.title)}</title>`);

      const description = meta(html, 'name', 'description');
      expect(description.length, 'description length').toBeGreaterThan(50);
      expect(description.length, 'description length').toBeLessThan(260);

      expect(html).toContain(`<link rel="canonical" href="${SITE}${page.address}" />`);
      expect(meta(html, 'property', 'og:url')).toBe(`${SITE}${page.address}`);
      expect(meta(html, 'property', 'og:title')).toBe(escapeHtml(page.title));
      expect(meta(html, 'property', 'og:description')).toBe(description);
      expect(meta(html, 'name', 'twitter:card')).toBe('summary_large_image');
      expect(html).not.toContain('noindex');

      // The picture of the link preview is a file of the build, at a full address.
      const image = meta(html, 'property', 'og:image');
      expect(image.startsWith(`${SITE}/`), image).toBe(true);
      expect(fs.existsSync(path.join(BUILD, image.slice(SITE.length))), `${image} exists`).toBe(true);
      expect(Number(meta(html, 'property', 'og:image:width'))).toBeGreaterThan(300);
    });

    test('carries structured data that names the author', () => {
      const html = read(page.file);
      const block = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
      const data = JSON.parse(block);
      expect(data['@context']).toBe('https://schema.org');
      expect(JSON.stringify(data)).toContain(profile.name);
    });
  });
}

test('every page has a different title and description', () => {
  const titles = pages.map((page) => /<title>([^<]*)<\/title>/.exec(read(page.file))[1]);
  const descriptions = pages.map((page) => meta(read(page.file), 'name', 'description'));
  expect(new Set(titles).size).toBe(pages.length);
  expect(new Set(descriptions).size).toBe(pages.length);
});

test('the "not found" page is a file of its own that search engines are told not to list', () => {
  const html = read('404.html');
  expect(visibleText(html)).toContain('This page does not exist');
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).not.toContain('rel="canonical"');
});

test('sitemap.xml lists every page once, and robots.txt points to it', () => {
  const sitemap = read('sitemap.xml');
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(listed.sort()).toEqual(pages.map((page) => `${SITE}${page.address}`).sort());
  const robots = read('robots.txt');
  expect(robots).toContain('User-agent: *');
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test('the share picture is 1200 by 630', () => {
  const png = fs.readFileSync(path.join(BUILD, 'og-image.png'));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the pages show their content and the links between them work', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Mohammed');
    await expect(page.locator('#work .project')).toHaveCount(projects.length);
    await expect(page.locator('#experience')).toContainText('UHRS');

    const first = [...projects].sort((a, b) => a.order - b.order)[0];
    await page.locator(`#work a[href="/work/${first.slug}/"]`).click();
    await expect(page.locator('h1')).toContainText(first.title);
    await expect(page.locator('main img').first()).toBeVisible();

    await page.getByRole('link', { name: 'All work' }).click();
    await expect(page).toHaveURL(/\/work\/$/);
    await expect(page.locator('#work .project')).toHaveCount(projects.length);
  });
});

test('React takes over the HTML of each kind of page without a mismatch', async ({ page }) => {
  const messages = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) messages.push(message.text());
  });
  page.on('pageerror', (error) => messages.push(error.message));

  for (const address of ['/', `/work/${projects[0].slug}/`]) {
    await page.goto(address);
    // React marks the element it has taken over with a property of its own.
    await page.waitForFunction(() => Object.keys(document.getElementById('root')).some((key) => key.startsWith('__reactContainer')));
    await page.waitForLoadState('networkidle');
  }
  expect(messages.filter((text) => /hydrat|did not match|mismatch/i.test(text))).toEqual([]);
  expect(messages, 'console errors and warnings').toEqual([]);
});

test('the page has drawn its text before the JavaScript arrives', async ({ page }) => {
  // The scripts are held back: what shows now is what the server sent.
  await page.route('**/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Mohammed');
  await expect(page.locator('#contact')).toContainText('Get in touch');
});
