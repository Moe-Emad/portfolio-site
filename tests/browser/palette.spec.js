// The command palette (tracker F7): Ctrl+K or the Search button, driven by the keyboard.
import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { axeFindings } from './support.js';

const profile = JSON.parse(fs.readFileSync('content/profile.json', 'utf8'));
const projects = fs
  .readdirSync('content/projects')
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
  // A draft is left out of the site (tracker F17).
  .filter((project) => project.draft !== true);

/** Opens an address and waits until React is running (the palette is opened by its code). */
async function open(page, address = '/') {
  await page.goto(address);
  await page.waitForFunction(() => Object.keys(document.getElementById('root')).some((key) => key.startsWith('__reactContainer')));
}

const palette = (page) => page.getByRole('dialog', { name: 'Search the site' });
const field = (page) => page.getByRole('combobox');
const options = (page) => page.getByRole('option');
const chosen = (page) => page.locator('[role="option"][aria-selected="true"]');

test('Ctrl+K opens the palette with the cursor in the field and every command listed', async ({ page }) => {
  await open(page);
  await expect(palette(page)).toBeHidden();
  await page.keyboard.press('Control+k');
  await expect(palette(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  // Five sections, every project, four actions.
  await expect(options(page)).toHaveCount(5 + projects.length + 4);
  await expect(chosen(page)).toHaveText(/^Work/);

  await page.keyboard.press('Control+k');
  await expect(palette(page)).toBeHidden();
});

test('the Search button opens it, Escape closes it and the cursor goes back to the button', async ({ page }) => {
  await open(page);
  const button = page.getByRole('button', { name: 'Search' });
  await button.click();
  await expect(palette(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();
  await expect(button).toBeFocused();
});

test('typing narrows the list and Enter goes to the project', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Control+k');
  await field(page).fill('rel');
  await expect(options(page)).toHaveCount(1);
  await expect(chosen(page)).toContainText('Relic');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\/relic\/$/);
  await expect(page.locator('h1')).toContainText('Relic');
});

test('a project is found by a technology it was built with', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Control+k');
  await field(page).fill('laravel');
  const expected = projects.filter((project) => project.stack.includes('Laravel'));
  await expect(options(page)).toHaveCount(expected.length);
  await expect(options(page).first()).toContainText(expected[0].title);
});

test('the arrow keys move the highlight and go round at the ends', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Control+k');
  await expect(chosen(page)).toHaveText(/^Work/);
  await page.keyboard.press('ArrowDown');
  await expect(chosen(page)).toHaveText(/^How I work/);
  await expect(field(page)).toHaveAttribute('aria-activedescendant', await chosen(page).getAttribute('id'));
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(chosen(page)).toHaveText(/^Open GitHub/);
  await expect(chosen(page)).toBeInViewport();
  await page.keyboard.press('Home');
  await expect(chosen(page)).toHaveText(/^Work/);
  // The cursor never leaves the field.
  await expect(field(page)).toBeFocused();
});

test('from a project page a section command leads to that section of the home page', async ({ page }) => {
  await open(page, '/work/relic/');
  await page.keyboard.press('Control+k');
  await field(page).fill('contact');
  await expect(chosen(page)).toHaveText(/^Contact/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.locator('#contact')).toBeInViewport();
});

test('the theme command switches the theme, and the button in the bar follows', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  await page.keyboard.press('Control+k');
  await field(page).fill('theme');
  await page.keyboard.press('Enter');
  await expect(palette(page)).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-label', 'Switch to the light theme');
});

test('the copy command puts the LinkedIn address on the clipboard and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await page.keyboard.press('Control+k');
  await field(page).fill('copy');
  await page.keyboard.press('Enter');
  await expect(palette(page).getByRole('status')).toHaveText('Copied to the clipboard.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(profile.links.linkedin);
  await expect(palette(page)).toBeVisible();
});

test('a search without a match says so', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Control+k');
  await field(page).fill('zzzz');
  await expect(options(page)).toHaveCount(0);
  await expect(palette(page).getByRole('status')).toContainText('Nothing matches');
  await page.keyboard.press('Enter');
  await expect(palette(page)).toBeVisible();
});

test('a click beside the palette closes it, a click on a command runs it', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.mouse.click(5, 5);
  await expect(palette(page)).toBeHidden();

  await page.getByRole('button', { name: 'Search' }).click();
  await options(page).filter({ hasText: 'Molok El-Sook' }).click();
  await expect(page).toHaveURL(/\/work\/molok-el-sook\/$/);
});

for (const colorScheme of ['light', 'dark']) {
  test(`axe finds no accessibility problem with the palette open in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await open(page);
    await page.keyboard.press('Control+k');
    await expect(palette(page)).toBeVisible();
    expect(await axeFindings(page)).toEqual([]);
  });
}
