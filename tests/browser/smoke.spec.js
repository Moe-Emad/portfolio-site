// Smoke tests (tracker A5): the home page loads, shows its sections and has no errors, on desktop and phone.
import { expect, test } from '@playwright/test';
import { axeFindings, expectNoProblems, watchPage } from './support.js';

// The sections every version of the home page must have, by the id the menu links to.
const SECTIONS = ['work', 'method', 'experience', 'skills', 'contact'];

test('the home page loads without errors and has a title', async ({ page }) => {
  const problems = watchPage(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/Emad/);
  await expect(page.locator('h1').first()).toBeVisible();
  expectNoProblems(problems);
});

test('the home page has its sections', async ({ page }) => {
  await page.goto('/');
  for (const id of SECTIONS) {
    await expect(page.locator(`#${id}`), `section #${id}`).toHaveCount(1);
  }
});

test('the page is not wider than the screen', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal scroll in pixels').toBeLessThanOrEqual(0);
});

test('axe finds no accessibility problem on the home page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await axeFindings(page)).toEqual([]);
});
