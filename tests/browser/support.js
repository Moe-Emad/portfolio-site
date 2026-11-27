// Shared helpers of the browser tests (tracker A5).
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

/**
 * Collects what must never happen while a page is used: an uncaught JavaScript error, or a file of the site
 * itself that fails to load. Call it before page.goto(); check with expectNoProblems() at the end.
 */
export function watchPage(page) {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`uncaught error: ${error.message}`));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1' && response.status() >= 400) {
      problems.push(`${response.status()} ${url.pathname}`);
    }
  });
  return problems;
}

export function expectNoProblems(problems) {
  expect(problems, 'the page had errors').toEqual([]);
}

/**
 * Waits until the page has stopped moving: no element changes its inline style between two looks
 * 250 ms apart. A text that is halfway through fading in is see-through, and axe would measure that moment
 * (it did, on the slower GitHub runner). Gives up after 10 seconds and lets the test go on.
 */
export async function settle(page) {
  await page.evaluate(async () => {
    // Only elements that carry an inline style (script-driven animations write there), and only the text of
    // that style: asking the browser for the computed style of every element was too slow on a busy page.
    const look = () => Array.from(document.body.querySelectorAll('[style]'), (element) => element.style.cssText).join(';');
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let before = look();
    // By the clock, not by the number of looks: on a busy page a 250 ms pause can take seconds.
    const giveUpAt = Date.now() + 10_000;
    while (Date.now() < giveUpAt) {
      await pause(250);
      const now = look();
      if (now === before) return;
      before = now;
    }
  });
}

/**
 * Accessibility findings of axe on the current page (WCAG 2.1 A and AA), as short lines.
 * knownRules: rule ids that are accepted for now, each with the tracker item that removes it.
 */
export async function axeFindings(page, knownRules = []) {
  await settle(page);
  // Let what is rising into place finish first (tracker F23): axe should see the page as it rests. An animation that
  // repeats for ever would never finish, so it is not waited for (the page has none since B13); nor is one tied to
  // the scroll (the star, F68), which runs as long as the page can scroll.
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          (animation) =>
            animation.playState !== 'running' ||
            animation.effect?.getComputedTiming().iterations === Infinity ||
            (animation.timeline && !(animation.timeline instanceof DocumentTimeline)),
        ),
    null,
    { timeout: 15000 },
  );
  // axe cannot measure text over a background image and leaves it out without a finding. The grid of the dark theme
  // (tracker F47) is such an image, so it is taken away while axe measures; the test "the dark theme is a blueprint"
  // proves it is too faint to change the contrast of any text. It is taken away through the style of the body itself:
  // the Content-Security-Policy (tracker B11) refuses a <style> block planted by a test as it would any other.
  await page.evaluate(() => document.body.style.setProperty('background-image', 'none', 'important'));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await page.evaluate(() => document.body.style.removeProperty('background-image'));
  return results.violations
    .filter((violation) => !knownRules.includes(violation.id))
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.help} - ${violation.nodes.length} element(s), first: ${violation.nodes[0].target.join(' ')}`);
}
