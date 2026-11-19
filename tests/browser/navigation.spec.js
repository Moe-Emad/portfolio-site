// Navigation (tracker B4): every link inside the page leads somewhere, and the keyboard reaches the main actions.
import fs from 'node:fs';
import { expect, test } from '@playwright/test';

/** Opens the home page and waits until React has drawn it. */
async function open(page) {
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
}

test('every in-page link points to a part of the page that exists', async ({ page }) => {
  await open(page);
  const targets = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(targets.length, 'in-page links on the page').toBeGreaterThan(0);
  for (const target of targets) {
    expect(target, 'a link to "#" alone goes nowhere').not.toBe('#');
    await expect(page.locator(`[id="${target.slice(1)}"]`), `target of ${target}`).toHaveCount(1);
  }
});

test('no link is without an address', async ({ page }) => {
  await open(page);
  // An <a> without href is not a link: the keyboard skips it and a screen reader does not announce it.
  await expect(page.locator('a:not([href])')).toHaveCount(0);
});

test('the first Tab shows a skip link that leads to the main content', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText(/skip to (the )?(main )?content/i);
  await expect(focused).toBeInViewport();
  const target = await focused.getAttribute('href');
  await expect(page.locator(`main${target}`)).toHaveCount(1);
});

test('the call to action is a link to the work section', async ({ page }) => {
  await open(page);
  const cta = page.getByRole('link', { name: /see (my|the) work/i }).first();
  await expect(cta).toHaveAttribute('href', /#work$/);
  await cta.focus();
  await expect(cta).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#work$/);
});

test('the favicon is declared with the type of its file', () => {
  const html = fs.readFileSync(`${process.env.E2E_BUILD}/index.html`, 'utf8');
  const icons = [...html.matchAll(/<link[^>]+rel="icon"[^>]*>/g)].map((match) => match[0]);
  expect(icons.length).toBeGreaterThan(0);
  const types = { png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon' };
  for (const icon of icons) {
    const href = /href="([^"]+)"/.exec(icon)[1];
    const type = /type="([^"]+)"/.exec(icon)?.[1];
    const extension = href.split('?')[0].split('.').pop();
    if (type) expect(type, icon).toBe(types[extension]);
  }
});
