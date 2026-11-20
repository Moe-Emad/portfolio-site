// The design (tracker F2): the themes, the phone menu, motion, the sign, and what the page loads.
import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { axeFindings } from './support.js';

/** Opens the home page and waits until React has drawn it. */
async function open(page) {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
}

const isPhone = (testInfo) => testInfo.project.name === 'phone';

/** The button that opens the sections: on a phone they are behind "Menu", on a wide screen always visible. */
async function showSections(page, testInfo) {
  if (isPhone(testInfo)) await page.getByRole('button', { name: 'Menu' }).click();
}

test.describe('themes', () => {
  test('the page opens in the theme of the system', async ({ browser }) => {
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      await open(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      await context.close();
    }
  });

  test('the theme button switches the theme, and the choice survives a reload', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await showSections(page, testInfo);
    await page.getByRole('button', { name: 'Switch to the dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Switch to the light theme' })).toBeVisible();

    await page.reload();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  for (const colorScheme of ['light', 'dark']) {
    test(`axe finds no accessibility problem in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await open(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      expect(await axeFindings(page)).toEqual([]);
    });
  }
});

test.describe('the menu', () => {
  test('on a phone the sections are behind a Menu button that the keyboard can open and close', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'the wide layout shows the sections all the time');
    await open(page);
    const button = page.getByRole('button', { name: 'Menu' });
    const work = page.getByRole('navigation').getByRole('link', { name: 'Work', exact: true });

    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(work).toBeHidden();

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
    await expect(work).toBeVisible();
    expect(await axeFindings(page), 'axe with the menu open').toEqual([]);

    await page.keyboard.press('Escape');
    await expect(work).toBeHidden();

    // Choosing a section closes the menu and goes there.
    await button.click();
    await work.click();
    await expect(page).toHaveURL(/#work$/);
    await expect(work).toBeHidden();
  });

  // Before F43 the open menu was a panel of about 420 px that ended in the middle of the screen, over the first screen.
  test('on a phone the open menu fills the screen from the bar to the bottom', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'the wide layout has no menu');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.getByRole('button', { name: 'Menu' }).click();
    const nav = page.locator('.site-nav');
    await expect(nav).toBeVisible();
    const found = await nav.evaluate((element) => {
      const bar = document.querySelector('.site-header').getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return { bar: Math.round(bar.bottom), top: Math.round(box.top), bottom: Math.round(box.bottom), screen: window.innerHeight };
    });
    expect(found.top, 'starts at the bar').toBe(found.bar);
    expect(found.bottom, 'reaches the bottom of the screen').toBeGreaterThanOrEqual(found.screen);
  });

  test('on a wide screen the sections are always visible and there is no Menu button', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'the phone layout folds the sections into a menu');
    await open(page);
    for (const name of ['Work', 'How I work', 'Experience', 'Skills', 'Contact']) {
      await expect(page.getByRole('navigation').getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  });
});

test('the name is one heading in two scripts, and the Arabic part is marked as Arabic', async ({ page }) => {
  await open(page);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Mohammed');
  const arabic = page.locator('h1 [lang="ar"]');
  await expect(arabic).toHaveAttribute('dir', 'rtl');
  await expect(arabic).toHaveText(/[؀-ۿ]/);
});

test('with "reduce motion" the drawing does not animate and the page does not scroll smoothly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const animations = await page.locator('.star__line').evaluateAll((lines) => lines.map((line) => getComputedStyle(line).animationName));
  expect(animations.length).toBeGreaterThan(0);
  expect(new Set(animations)).toEqual(new Set(['none']));
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});

test('the record of the site shows figures counted from the repository', async ({ page }) => {
  await open(page);
  const figures = await page.locator('#method .record dt').allTextContents();
  expect(figures).toHaveLength(3);
  for (const figure of figures) expect(Number(figure), `"${figure}" is a number above zero`).toBeGreaterThan(0);
});

test('the page asks no other server for anything', async ({ page }) => {
  const outside = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1') outside.push(request.url());
  });
  await open(page);
  await page.waitForLoadState('networkidle');
  expect(outside, 'requests to other servers (fonts, scripts, trackers)').toEqual([]);
});

// Speed Insights (tracker F28) lives at an address only Vercel serves; any other build must not ask for it.
test('outside Vercel the page loads no Speed Insights script', async ({ page }) => {
  const vercel = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/_vercel/')) vercel.push(request.url());
  });
  await open(page);
  await page.waitForLoadState('networkidle');
  expect(vercel).toEqual([]);
  expect(await page.locator('script[src*="speed-insights"]').count()).toBe(0);
});

test('the fonts are served by the site and both are in use', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family.replace(/"/g, '')));
  expect(loaded).toContain('Rakkas');
  expect(loaded).toContain('Readex Pro Variable');
});

// A wide screen is used, not left empty at the sides (tracker F18). Measured at 1,920 px, the width of a common
// desktop screen; the phone project runs it too, at the same size, which is harmless.
test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('the content uses most of the width, the pictures grow with it, and nothing scrolls sideways', async ({ page }) => {
    for (const address of ['/', '/work/relic/']) {
      await page.goto(address);
      await expect(page.locator('h1')).toBeVisible();
      const widths = await page.evaluate(() => ({
        page: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        content: Math.max(...[...document.querySelectorAll('main .wrap')].map((element) => element.getBoundingClientRect().width)),
      }));
      expect(widths.scroll, `${address} scrolls sideways`).toBeLessThanOrEqual(widths.page);
      expect(widths.content / widths.page, `share of the width used on ${address}`).toBeGreaterThanOrEqual(0.75);
    }

    await page.goto('/');
    const picture = await page.locator('#work .project .shot').first().boundingBox();
    expect(picture?.width ?? 0, 'the first project picture').toBeGreaterThanOrEqual(850);
  });

  test('running text keeps a readable line length', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    // About 75 characters at most: the width of a paragraph divided by the width of its "0".
    const longest = await page.evaluate(() => {
      const ruler = document.createElement('span');
      ruler.textContent = '0';
      return Math.max(
        ...[...document.querySelectorAll('main p, main li')]
          .filter((element) => element.getClientRects().length > 0 && (element.textContent ?? '').length > 120)
          .map((element) => {
            element.append(ruler);
            const zero = ruler.getBoundingClientRect().width;
            ruler.remove();
            return element.getBoundingClientRect().width / zero;
          }),
      );
    });
    expect(longest).toBeLessThanOrEqual(80);
  });
});

// Life and motion (tracker F20). Text is never hidden: only pictures wait, and only below the first screen.
test.describe('motion', () => {
  test('a picture further down waits below the screen and appears as it comes into view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    const last = page.locator('#work .project .shot').last();
    await expect(last).toHaveAttribute('data-reveal', 'waiting');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toHaveAttribute('data-reveal', 'shown');
  });

  test('the name rises into place when the page opens, and the Arabic name is written from the right', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    const names = await page.evaluate(() =>
      ['.sign__first', '.sign__rest', '.sign__arabic'].map((selector) => getComputedStyle(document.querySelector(selector)).animationName),
    );
    expect(names).toEqual(['rise-in', 'rise-in', 'write-rtl']);
  });

  test('with "reduce motion" nothing waits and the name does not move', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.waitForTimeout(500);
    expect(await page.locator('[data-reveal="waiting"]').count()).toBe(0);
    expect(await page.locator('.sign__first').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  });

  test('without JavaScript every picture is shown', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    const clips = await page.locator('.shot, .shot picture').evaluateAll((shots) => shots.map((shot) => getComputedStyle(shot).clipPath));
    expect(clips.length).toBeGreaterThan(0);
    expect(new Set(clips)).toEqual(new Set(['none']));
    await context.close();
  });
});

// Smaller and earlier work as a register (tracker F41), like the list of sheets in a set of drawings: one entry
// under another between hairlines, each with its name, what it is and its tools, set smaller than the main work. It
// replaces the sheet of cells of F22, which had the same star in every cell and a hover on cells that are not links.
test.describe('the smaller and earlier work', () => {
  test('is a register: one entry under another, each with its name, what it is and its tools', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const entries = page.locator('#work .archive > li');
    expect(await entries.count()).toBeGreaterThan(3);
    await expect(page.locator('#work .archive svg, #work .archive img')).toHaveCount(0);
    const rowName = await page.locator('#work .project__title').first().evaluate((title) => parseFloat(getComputedStyle(title).fontSize));
    const found = await entries.evaluateAll((items) =>
      items.map((item) => {
        const box = (selector) => {
          const element = item.querySelector(selector);
          const rect = element.getBoundingClientRect();
          return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, text: element.textContent.trim() };
        };
        const own = item.getBoundingClientRect();
        const name = getComputedStyle(item.querySelector('.archive__name'));
        return {
          top: own.top,
          bottom: own.bottom,
          hairline: parseFloat(getComputedStyle(item).borderBottomWidth),
          size: parseFloat(name.fontSize),
          face: name.fontFamily,
          name: box('.archive__name'),
          summary: box('.archive__summary'),
          tools: box('.archive__tech'),
        };
      }),
    );
    for (const [index, entry] of found.entries()) {
      const what = entry.name.text;
      for (const part of ['name', 'summary', 'tools']) expect(entry[part].text, `${what}: ${part}`).not.toBe('');
      if (index > 0) expect(entry.top, `${what} stands under the entry before it`).toBeGreaterThanOrEqual(found[index - 1].bottom - 1);
      expect(entry.hairline, `${what}: a hairline under it`).toBeGreaterThan(0);
      expect(entry.face, `${what}: the name in the text face`).not.toMatch(/^"?Rakkas\b/);
      expect(entry.size, `${what}: a name smaller than the name of a project row`).toBeLessThanOrEqual(0.6 * rowName);
      if (isPhone(testInfo)) {
        expect(entry.summary.top, `${what}: what it is, under the name`).toBeGreaterThanOrEqual(entry.name.bottom - 1);
        expect(entry.tools.top, `${what}: the tools, under what it is`).toBeGreaterThanOrEqual(entry.summary.bottom - 1);
      } else {
        expect(entry.summary.left, `${what}: what it is, beside the name`).toBeGreaterThanOrEqual(entry.name.right);
        expect(entry.tools.left, `${what}: the tools, beside what it is`).toBeGreaterThanOrEqual(entry.summary.right);
        expect(Math.abs(entry.summary.top - entry.name.top), `${what}: on one line`).toBeLessThan(8);
      }
    }
  });

  test('nothing about an entry changes under the mouse, since it is not a link', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const entry = page.locator('#work .archive > li').first();
    await entry.scrollIntoViewIfNeeded();
    const look = (item) =>
      [item, ...item.querySelectorAll('*')]
        .flatMap((element) => [getComputedStyle(element), getComputedStyle(element, '::before'), getComputedStyle(element, '::after')])
        .map((style) => [style.backgroundColor, style.color, style.borderTopColor, style.transform, style.rotate, style.stroke, style.content].join(' '))
        .join(' | ');
    const still = await entry.evaluate(look);
    await entry.hover();
    await page.waitForTimeout(300);
    expect(await entry.evaluate(look)).toBe(still);
  });
});

// While scrolling, lines draw themselves (tracker F48, after F23): a block that carries a rule draws it from left to
// right as it comes into view, and its text stands still all the time. The figures never count up.
test.describe('scrolling', () => {
  const RULED = ['#experience .job', '#skills .skill-group', '#work .archive > li'];

  test('a rule further down draws across as it comes into view, and the text of its block never moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    for (const selector of RULED) {
      const block = page.locator(selector).first();
      await expect(block, selector).toHaveAttribute('data-reveal', 'waiting');
      const still = (element) =>
        [...element.querySelectorAll('*')].every((child) => {
          const style = getComputedStyle(child);
          return style.clipPath === 'none' && (style.translate === 'none' || style.translate === '0px') && style.opacity === '1';
        });
      const drawn = (element) => getComputedStyle(element).getPropertyValue('--drawn').trim();
      expect(await block.evaluate(still), `${selector}: its text waits in place`).toBe(true);
      expect(await block.evaluate(drawn), `${selector}: its rule is not drawn yet`).toBe('0%');
      await block.scrollIntoViewIfNeeded();
      await expect(block, selector).toHaveAttribute('data-reveal', 'shown');
      await expect.poll(() => block.evaluate(drawn), { message: `${selector}: its rule is drawn` }).toBe('100%');
      expect(await block.evaluate(still), `${selector}: its text did not move`).toBe(true);
    }
  });

  test('the figures show their real value from the start and never count', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    await expect(page.locator('[data-count]')).toHaveCount(0);
    const figures = page.locator('#method .record dt, #work .project__facts dt');
    const before = await figures.allTextContents();
    await page.locator('#method .record').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    expect(await figures.allTextContents()).toEqual(before);
    expect(await page.locator('[data-counted]').count()).toBe(0);
  });

  test('under the mouse the picture of a project lifts gently', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'a phone has no mouse');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    const row = page.locator('#work .project').first();
    await row.locator('.shot').scrollIntoViewIfNeeded();
    await row.hover({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(600);
    const lift = await row.locator('.shot').evaluate((shot) => new DOMMatrix(getComputedStyle(shot).transform).m42);
    expect(lift, 'lifted, but by 3 px at most').toBeGreaterThanOrEqual(-3);
    expect(lift, 'lifted, but by 3 px at most').toBeLessThan(0);
  });

  test('with "reduce motion" no block waits and the figures do not count', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    expect(await page.locator('[data-reveal="waiting"]').count()).toBe(0);
    expect(await page.locator('[data-counted]').count()).toBe(0);
  });
});

// A printed page shows every block (tracker B9): what still waits below the screen is in place on paper.
test.describe('printing', () => {
  const project = fs
    .readdirSync('content/projects')
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
    .find((entry) => entry.draft !== true);

  for (const path of ['/', `/work/${project.slug}/`]) {
    test(`${path} printed without scrolling hides no block or picture`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      // Without anything waiting the test would prove nothing.
      await expect(page.locator('[data-reveal="waiting"]').first()).toBeAttached();

      await page.emulateMedia({ media: 'print' });
      const hidden = await page.evaluate(() => {
        const found = [];
        const check = (element, what, style) => {
          if (style.clipPath !== 'none') found.push(`${what}: clip-path ${style.clipPath}`);
          if (style.translate !== 'none' && style.translate !== '0px') found.push(`${what}: translate ${style.translate}`);
        };
        for (const block of document.querySelectorAll('[data-animate][data-reveal="waiting"]')) {
          for (const child of block.children) check(child, `${block.className} > ${child.tagName.toLowerCase()}`, getComputedStyle(child));
          // A rule that is still to be drawn (F48) is whole on paper.
          const rule = getComputedStyle(block).borderImageSource;
          if (rule !== 'none') found.push(`${block.className}: its rule is drawn by ${rule}`);
        }
        for (const shot of document.querySelectorAll('.shot[data-reveal="waiting"]')) {
          check(shot, 'shot', getComputedStyle(shot));
          check(shot, 'shot picture', getComputedStyle(shot.querySelector('picture')));
        }
        return found;
      });
      expect(hidden).toEqual([]);
    });
  }
});

// No stripe down one side of a block (tracker F30): the page draws its rules as hairlines. A stripe is a border at
// the left or right that is wider than one pixel and wider than the borders above and below it; a field with the
// same border all round is not one.
test.describe('side stripes', () => {
  const project = fs
    .readdirSync('content/projects')
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
    .find((entry) => entry.draft !== true);

  for (const path of ['/', `/work/${project.slug}/`]) {
    test(`${path} has no block with a stripe down one side`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const stripes = await page.evaluate(() => {
        const found = [];
        for (const element of document.body.querySelectorAll('*')) {
          const style = getComputedStyle(element);
          const across = Math.max(parseFloat(style.borderTopWidth), parseFloat(style.borderBottomWidth));
          for (const side of ['Left', 'Right']) {
            const width = parseFloat(style[`border${side}Width`]);
            if (width > 1 && width > across) {
              const name = `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().split(/\s+/).join('.')}` : ''}`;
              found.push(`${name}: ${width}px ${style[`border${side}Style`]} ${style[`border${side}Color`]} at the ${side.toLowerCase()}`);
            }
          }
        }
        return [...new Set(found)];
      });
      expect(stripes).toEqual([]);
    });
  }
});

// Section titles stand on their own (tracker F34): no bar or other drawing under them. The lists under them open
// with a hairline of their own, and the accent colour is kept for the sign.
test.describe('section titles', () => {
  for (const path of ['/', '/work/', '/work/no-such-project/']) {
    test(`on ${path} no section title has a bar or other drawing under it`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const titles = page.locator('.section__title');
      expect(await titles.count()).toBeGreaterThan(0);
      const drawn = await titles.evaluateAll((elements) =>
        elements.flatMap((element) => {
          const found = [];
          const name = `"${element.textContent.trim()}"`;
          for (const pseudo of ['::before', '::after']) {
            const content = getComputedStyle(element, pseudo).content;
            if (content !== 'none' && content !== 'normal') found.push(`${name}: a drawing in ${pseudo}`);
          }
          const style = getComputedStyle(element);
          if (parseFloat(style.borderBottomWidth) > 0) found.push(`${name}: a border at the bottom`);
          if (style.textDecorationLine !== 'none') found.push(`${name}: text decoration ${style.textDecorationLine}`);
          if (style.backgroundImage !== 'none') found.push(`${name}: a background image`);
          return found;
        }),
      );
      expect(drawn).toEqual([]);
    });
  }

  test('a section title further down stands in place while the page scrolls', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    // Something further down does wait, or the test would prove nothing.
    await expect(page.locator('#work .project .shot').last()).toHaveAttribute('data-reveal', 'waiting');
    for (const id of ['experience', 'skills', 'contact']) {
      const title = page.locator(`#${id} .section__title`);
      await expect(title, id).not.toHaveAttribute('data-reveal');
      await title.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await expect(title, id).not.toHaveAttribute('data-reveal');
    }
  });
});

// The footer says only the year and the name (tracker F31): how the site was built is for the repository.
test.describe('the footer', () => {
  const profile = JSON.parse(fs.readFileSync('content/profile.json', 'utf8'));

  for (const path of ['/', '/work/relic/']) {
    test(`on ${path} it gives the year and the name, and nothing about how the site was built`, async ({ page }) => {
      await page.goto(path);
      const footer = page.locator('.site-footer');
      await expect(footer.locator('p', { hasText: '©' })).toHaveText(`© ${new Date().getFullYear()} ${profile.name}.`);
      await expect(footer).not.toContainText(/built with|template/i);
    });
  }
});

// Tools are listed as plain text (tracker F35): one line separated by commas, as in the rows of the work list. No
// chip or pill: no border, no background and no change under the mouse, since the names are not links.
test.describe('lists of tools', () => {
  const lists = [
    { path: '/', what: 'a row of the skills', selector: '#skills .skill-group ul' },
    { path: '/', what: 'a row of the work list', selector: '#work .project ul.stack' },
    { path: '/work/mtc-training-platform/', what: 'a project page', selector: '.case__side ul' },
  ];
  const look = (item) => {
    const style = getComputedStyle(item);
    return [style.borderColor, style.backgroundColor, style.color, style.textDecorationLine, style.transform].join(' | ');
  };

  for (const { path, what, selector } of lists) {
    test(`on ${what} the tools are one line of text, without chips or pills`, async ({ page }) => {
      // Nothing rises into place, so the mouse finds the names where they stand.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const list = page.locator(selector).first();
      await list.scrollIntoViewIfNeeded();
      const items = list.locator('li');
      expect(await items.count()).toBeGreaterThan(1);
      const found = await items.evaluateAll((elements) =>
        elements.flatMap((item, index) => {
          const style = getComputedStyle(item);
          const name = item.textContent;
          const problems = [];
          if (style.display !== 'inline') problems.push(`${name}: display ${style.display}`);
          for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
            if (parseFloat(style[`border${side}Width`]) > 0) problems.push(`${name}: a border at the ${side.toLowerCase()}`);
          }
          if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') problems.push(`${name}: background ${style.backgroundColor}`);
          const after = getComputedStyle(item, '::after').content;
          const expected = index < elements.length - 1 ? '", "' : 'none';
          if (after !== expected) problems.push(`${name}: followed by ${after} instead of ${expected}`);
          return problems;
        }),
      );
      expect(found).toEqual([]);

      // Nothing about a name changes under the mouse. A row of the work list is a link as a whole, whose area lies
      // over the names, so the mouse is moved there without waiting for the name to be the topmost element.
      const first = items.first();
      const still = await first.evaluate(look);
      await first.hover({ force: true });
      await page.waitForTimeout(200);
      expect(await first.evaluate(look)).toBe(still);
    });
  }
});

// Two corner radii for the interface (tracker F37): a small one for what is clicked or typed into and for the focus
// ring, a large one for frames (screenshots, the palette). A phone screen is drawn as a phone (F50), with the corners
// of its body and of its screen. All are tokens at the top of src/index.css.
test.describe('corners', () => {
  const RADII = ['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];

  test('every radius in the stylesheet, in any state, is one of the tokens', async ({ page }) => {
    await open(page);
    const found = await page.evaluate((properties) => {
      const problems = [];
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.cssRules) walk(rule.cssRules);
          if (!rule.style) continue;
          const shorthand = rule.style.getPropertyValue(properties[0]).trim();
          const values = shorthand ? [[properties[0], shorthand]] : properties.slice(1).map((property) => [property, rule.style.getPropertyValue(property).trim()]);
          for (const [property, value] of values) {
            if (['', '0', '0px', 'var(--radius)', 'var(--radius-frame)', 'var(--radius-phone)', 'var(--radius-screen)'].includes(value)) continue;
            problems.push(`${rule.selectorText}: ${property} ${value}`);
          }
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules);
      return [...new Set(problems)];
    }, RADII);
    expect(found).toEqual([]);
  });

  for (const path of ['/', '/work/mtc-training-platform/']) {
    test(`on ${path} every corner is square, small or large, or the corner of a phone`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const { small, large, found } = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const small = root.getPropertyValue('--radius').trim();
        const large = root.getPropertyValue('--radius-frame').trim();
        const phone = [root.getPropertyValue('--radius-phone').trim(), root.getPropertyValue('--radius-screen').trim()];
        const allowed = new Set(['0px', small, large, ...phone.filter(Boolean)]);
        const problems = [];
        // The palette is in the page while closed, so its rows and keys are counted too.
        for (const element of document.querySelectorAll('*')) {
          for (const pseudo of [null, '::before', '::after']) {
            const style = getComputedStyle(element, pseudo);
            if (pseudo && style.content === 'none') continue;
            for (const corner of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
              if (!allowed.has(style[corner])) {
                const name = `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}${pseudo ?? ''}`;
                problems.push(`${name}: ${style[corner]}`);
              }
            }
          }
        }
        return { small, large, found: [...new Set(problems)] };
      });
      expect(small, 'the small radius').toBe('4px');
      expect(large, 'the large radius').toBe('10px');
      expect(found).toEqual([]);
    });
  }
});

// The frames of the screens (tracker F50). Before, every screenshot stood in the same card, with its caption inside
// under a hairline. Now a wide screen has a hairline frame, a phone screen is drawn as a phone, and the caption stands
// under the frame as the caption of a figure.
test.describe('screens', () => {
  const PROJECT = '/work/mtc-training-platform/';

  test('a caption stands under its picture, and no card boxes the two together', async ({ page }) => {
    await page.goto(PROJECT);
    await expect(page.locator('h1')).toBeVisible();
    const found = await page.evaluate(() => {
      const problems = [];
      const shots = [...document.querySelectorAll('.shot')];
      for (const shot of shots) {
        const name = shot.querySelector('img').getAttribute('src');
        const style = getComputedStyle(shot);
        if (['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(style[`border${side}Width`]) > 0)) problems.push(`${name}: the figure has a border`);
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') problems.push(`${name}: the figure has a ground of its own`);
        const frame = shot.querySelector(':scope > .shot__frame');
        if (!frame) {
          problems.push(`${name}: no frame of its own around the picture`);
          continue;
        }
        if (!frame.querySelector('picture')) problems.push(`${name}: the picture is outside its frame`);
        const caption = shot.querySelector('figcaption');
        if (!caption) continue;
        if (frame.contains(caption)) problems.push(`${name}: the caption is inside the frame`);
        if (caption.getBoundingClientRect().top < frame.getBoundingClientRect().bottom) problems.push(`${name}: the caption is not under the frame`);
        if (parseFloat(getComputedStyle(caption).borderTopWidth) > 0) problems.push(`${name}: a hairline over the caption`);
      }
      return { captions: shots.filter((shot) => shot.querySelector('figcaption')).length, problems };
    });
    expect(found.captions, 'pictures with a caption on this page').toBeGreaterThan(3);
    expect(found.problems).toEqual([]);
  });

  test('a phone screen is drawn as a phone, a wide screen in a hairline frame', async ({ page }) => {
    await page.goto(PROJECT);
    await expect(page.locator('h1')).toBeVisible();
    const found = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement('i');
      document.body.append(probe);
      probe.style.color = 'var(--line)';
      const line = getComputedStyle(probe).color;
      probe.remove();
      const frameRadius = parseFloat(root.getPropertyValue('--radius-frame'));
      const problems = [];
      const frames = (device) => [...document.querySelectorAll(`.shot[data-device="${device}"] > .shot__frame`)];
      const wide = frames('desktop');
      const phones = frames('phone');
      for (const frame of wide) {
        const style = getComputedStyle(frame);
        const name = frame.querySelector('img').getAttribute('src');
        if (parseFloat(style.borderTopWidth) !== 1 || style.borderTopColor !== line) problems.push(`${name}: not a hairline frame`);
        if (parseFloat(style.borderTopLeftRadius) !== frameRadius) problems.push(`${name}: corner ${style.borderTopLeftRadius}`);
      }
      for (const frame of phones) {
        const style = getComputedStyle(frame);
        const name = frame.querySelector('img').getAttribute('src');
        const body = frame.getBoundingClientRect();
        const screen = frame.querySelector('picture');
        const inside = screen.getBoundingClientRect();
        // The body has the corners of a phone: far rounder than a wide screen's frame, about a tenth of its width.
        const corner = parseFloat(style.borderTopLeftRadius);
        if (corner < 3 * frameRadius || corner < body.width * 0.1) problems.push(`${name}: the body has a corner of ${corner} px at ${Math.round(body.width)} px wide`);
        // The screen sits inside the outline with a margin all round, and its own corners curve too.
        const margins = [inside.left - body.left, body.right - inside.right, inside.top - body.top, body.bottom - inside.bottom];
        if (margins.some((margin) => margin < 4)) problems.push(`${name}: the screen touches the outline (${margins.map(Math.round).join(', ')})`);
        const screenCorner = parseFloat(getComputedStyle(screen).borderTopLeftRadius);
        if (!(screenCorner > frameRadius && screenCorner < corner)) problems.push(`${name}: the screen has a corner of ${screenCorner} px`);
        if (getComputedStyle(screen).overflow !== 'hidden') problems.push(`${name}: the screen does not clip its picture to its corners`);
      }
      return { wide: wide.length, phones: phones.length, problems };
    });
    expect(found.wide, 'wide screens on this page').toBeGreaterThan(0);
    expect(found.phones, 'phone screens on this page').toBeGreaterThan(0);
    expect(found.problems).toEqual([]);
  });

  test('on a wide screen the cover is no wider than its pixels and stands in the middle under the band', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'about wide screens');
    await page.setViewportSize({ width: 1920, height: 1080 });
    const slugs = fs
      .readdirSync('content/projects')
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
      .filter((project) => project.draft !== true && project.images.length > 0 && project.images[0].device === 'desktop')
      .map((project) => project.slug);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      await page.goto(`/work/${slug}/`);
      await expect(page.locator('h1')).toBeVisible();
      const cover = await page.locator('.case__cover img').evaluate((image) => {
        const shown = image.getBoundingClientRect();
        const body = image.closest('.case__body').getBoundingClientRect();
        return { shown: shown.width, pixels: Number(image.getAttribute('width')), left: shown.left - body.left, right: body.right - shown.right };
      });
      expect(cover.shown, `${slug}: the cover is drawn ${Math.round(cover.shown)} px wide from ${cover.pixels} px`).toBeLessThanOrEqual(cover.pixels);
      expect(Math.abs(cover.left - cover.right), `${slug}: room left and right of the cover`).toBeLessThan(2);
    }
  });
});

// Skills as rows by group, without counts (tracker F24); their tools as a line of text since F35.
test.describe('the skills', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('are rows by group, each with its tools in a line, and no counts', async ({ page }) => {
    const groups = JSON.parse(fs.readFileSync('content/skills.json', 'utf8'));
    await page.goto('/');
    await expect(page.locator('#skills .skill-count')).toHaveCount(0);
    await expect(page.locator('#skills')).not.toContainText('The number after a skill');
    const rows = page.locator('#skills .skill-group');
    await expect(rows).toHaveCount(groups.length);
    for (const [index, group] of groups.entries()) {
      await expect(rows.nth(index).locator('h3')).toHaveText(group.group);
      await expect(rows.nth(index).locator('ul > li')).toHaveText(group.skills);
    }
  });

  test('on a wide screen stand on the lines of Experience: name, note and tools', async ({ page }) => {
    // Tracker F57. The tools ended near the middle of each row and left the right of the section empty; Experience
    // above uses the width with the dates, the role and the points.
    await page.goto('/');
    const lefts = (selector) => page.locator(selector).evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().left)));
    const [date] = await lefts('#experience .job__period');
    const [role] = await lefts('#experience .job__role');
    const [points] = await lefts('#experience .job__points');
    expect(new Set([date, role, points]).size, 'three columns in Experience').toBe(3);
    expect(new Set(await lefts('#skills .skill-group h3')), 'the names of the groups').toEqual(new Set([date]));
    expect(new Set(await lefts('#skills .skill-group p')), 'the notes').toEqual(new Set([role]));
    expect(new Set(await lefts('#skills .skill-group ul')), 'the tools').toEqual(new Set([points]));
  });

  test('on a smaller screen keep the tools beside the name and the note', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    for (const row of await page.locator('#skills .skill-group').all()) {
      const [name, note, tools] = await Promise.all(['h3', 'p', 'ul'].map((part) => row.locator(part).evaluate((element) => element.getBoundingClientRect())));
      expect(Math.round(note.left), 'the note under the name').toBe(Math.round(name.left));
      expect(tools.left, 'the tools to the right of the note').toBeGreaterThan(note.right);
    }
  });
});

// The measured figures of a project (tracker F38) are a title block, the table in the corner of a technical drawing,
// instead of a strip of big numbers: each figure in a cell of its own inside one frame, no row of cells left half
// empty (a phone had three figures and then one alone), and no figure in the display face or larger than the name
// of a project in the list (1.6rem). The record of the site keeps its large figures: it is the one place for them.
test.describe('figures', () => {
  const blocks = [
    { path: '/', what: 'the rows of the work list', selector: '#work .project__facts' },
    { path: '/work/mtc-training-platform/', what: 'a project page', selector: '.facts' },
    { path: '/work/molok-el-sook/', what: 'a project page with three figures', selector: '.facts' },
  ];

  for (const { path, what, selector } of blocks) {
    test(`on ${what} the figures are a table of framed cells, not a strip of big numbers`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const tables = page.locator(selector);
      expect(await tables.count()).toBeGreaterThan(0);
      for (const table of await tables.all()) {
        await table.scrollIntoViewIfNeeded();
        const found = await table.evaluate((frame) => {
          const problems = [];
          const name = [...frame.querySelectorAll('dd')].map((label) => label.textContent).join(', ');
          const style = getComputedStyle(frame);
          const box = frame.getBoundingClientRect();
          const inner = {
            top: box.top + parseFloat(style.borderTopWidth),
            right: box.right - parseFloat(style.borderRightWidth),
            bottom: box.bottom - parseFloat(style.borderBottomWidth),
            left: box.left + parseFloat(style.borderLeftWidth),
          };
          const cells = [...frame.children].map((cell) => ({ cell, box: cell.getBoundingClientRect(), style: getComputedStyle(cell) }));
          const near = (a, b) => Math.abs(a - b) <= 1;
          const overlaps = (a, b, from, to) => Math.min(a[to], b[to]) - Math.max(a[from], b[from]) > 1;
          const opposite = { Top: 'Bottom', Bottom: 'Top', Left: 'Right', Right: 'Left' };

          // Every row of cells runs from one side of the frame to the other.
          const rows = new Map();
          for (const item of cells) {
            const top = Math.round(item.box.top);
            rows.set(top, [...(rows.get(top) ?? []), item.box]);
          }
          for (const row of rows.values()) {
            const from = Math.min(...row.map((cell) => cell.left));
            const to = Math.max(...row.map((cell) => cell.right));
            if (!near(from, inner.left) || !near(to, inner.right)) {
              problems.push(`${name}: a row of ${row.length} cells covers ${Math.round(from)}-${Math.round(to)} of a frame ${Math.round(inner.left)}-${Math.round(inner.right)}`);
            }
          }

          // Every side of every cell is drawn: by the cell, by the frame, or by the cell next to it.
          for (const { cell, box: own, style: look } of cells) {
            const label = cell.querySelector('dd')?.textContent;
            for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
              const edge = own[side.toLowerCase()];
              const across = side === 'Top' || side === 'Bottom' ? ['left', 'right'] : ['top', 'bottom'];
              const drawn =
                parseFloat(look[`border${side}Width`]) > 0 ||
                (parseFloat(style[`border${side}Width`]) > 0 && near(edge, inner[side.toLowerCase()])) ||
                cells.some(
                  (other) =>
                    other.cell !== cell &&
                    parseFloat(other.style[`border${opposite[side]}Width`]) > 0 &&
                    near(other.box[opposite[side].toLowerCase()], edge) &&
                    overlaps(other.box, own, ...across),
                );
              if (!drawn) problems.push(`${label}: no line at the ${side.toLowerCase()} of its cell`);
            }
          }

          // The figure itself: the text face, no larger than the name of a project in the list.
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
          for (const value of frame.querySelectorAll('dt')) {
            const look = getComputedStyle(value);
            // The browser gives the first name of the font with or without quotes.
            if (/^"?Rakkas\b/.test(look.fontFamily)) problems.push(`${value.textContent}: in the display face`);
            if (parseFloat(look.fontSize) > 1.6 * rem) problems.push(`${value.textContent}: ${look.fontSize}, larger than 1.6rem`);
          }
          return problems;
        });
        expect(found).toEqual([]);
      }
    });
  }
});

// The first screen of a project page (tracker F39): the title block of its figures stands in the blue band, where a
// drawing has it, at the bottom right beside the summary on a wide screen, so the right half of the band is no longer
// empty; under the summary on a phone. My part and the tools stand on the page under a hairline, not in a card.
test.describe('the first screen of a project page', () => {
  const PAGE = '/work/mtc-training-platform/';

  for (const width of [1024, 1280, 1920]) {
    test(`at ${width} px the title block fills the right of the blue band, beside the summary and above the picture`, async ({ page }, testInfo) => {
      test.skip(isPhone(testInfo), 'wide screens only');
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(PAGE);
      await expect(page.locator('h1')).toBeVisible();
      const block = page.locator('.case__head .facts');
      await expect(block).toBeVisible();
      await expect(page.locator('.case__body .facts')).toHaveCount(0);
      const [band, wrap, summary, figures, cover] = await Promise.all(
        ['.case__head', '.case__head .wrap', '.case__summary', '.case__head .facts', '.case__cover'].map((selector) =>
          page.locator(selector).first().evaluate((element) => {
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { top: box.top, right: box.right - parseFloat(style.paddingRight), bottom: box.bottom, left: box.left + parseFloat(style.paddingLeft) };
          }),
        ),
      );
      expect(figures.left, 'beside the summary, not under it').toBeGreaterThan(summary.right);
      expect(figures.left, 'in the right half of the band').toBeGreaterThan((wrap.left + wrap.right) / 2 - 1);
      expect(Math.abs(figures.right - wrap.right), 'reaches the right edge of the content').toBeLessThanOrEqual(1);
      expect(figures.top, 'level with the summary').toBeLessThan(summary.bottom);
      expect(figures.bottom, 'inside the band').toBeLessThanOrEqual(band.bottom);
      expect(figures.bottom, 'above the picture that hangs into the band').toBeLessThanOrEqual(cover.top);
    });
  }

  test('on a phone the title block follows the summary inside the band, two across', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'phone size only');
    await page.goto(PAGE);
    const cells = page.locator('.case__head .facts > div');
    await expect(cells).toHaveCount(4);
    const tops = await cells.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(2);
  });

  test('in the band the title block is drawn in the colours of the band', async ({ page }) => {
    await page.goto(PAGE);
    const colours = await page.locator('.case__head .facts').evaluate((block) => {
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement('i');
      document.body.append(probe);
      const resolve = (token) => {
        probe.style.color = root.getPropertyValue(token);
        return getComputedStyle(probe).color;
      };
      const tokens = { line: resolve('--on-blue-line'), value: resolve('--on-blue'), label: resolve('--on-blue-muted') };
      probe.remove();
      return {
        tokens,
        frame: getComputedStyle(block).borderTopColor,
        cell: getComputedStyle(block.querySelector('div')).borderRightColor,
        value: getComputedStyle(block.querySelector('dt')).color,
        label: getComputedStyle(block.querySelector('dd')).color,
      };
    });
    expect(colours.frame).toBe(colours.tokens.line);
    expect(colours.cell).toBe(colours.tokens.line);
    expect(colours.value).toBe(colours.tokens.value);
    expect(colours.label).toBe(colours.tokens.label);
  });

  test('my part and the tools stand on the page under a hairline, not in a card', async ({ page }) => {
    await page.goto(PAGE);
    const side = await page.locator('.case__side').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        radius: style.borderTopLeftRadius,
        sides: ['Top', 'Right', 'Bottom', 'Left'].filter((side) => parseFloat(style[`border${side}Width`]) > 0),
      };
    });
    expect(side).toEqual({ background: 'rgba(0, 0, 0, 0)', radius: '0px', sides: ['Top'] });
  });
});

// A row of the work list has one clear top (tracker F40): the name of its project, in the display face as on the
// project's page, at least one and a half times the size of any other text of the row. My part, what the row says I
// did, is in ink; its label is the muted part.
test('each row of the work list has its name on top and my part in ink', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const rows = page.locator('#work .project');
  expect(await rows.count()).toBeGreaterThan(1);
  for (const row of await rows.all()) {
    const found = await row.evaluate((element) => {
      const problems = [];
      const title = element.querySelector('.project__title');
      const name = title.textContent;
      const titleStyle = getComputedStyle(title);
      const size = parseFloat(titleStyle.fontSize);
      if (!/^"?Rakkas\b/.test(titleStyle.fontFamily)) problems.push(`${name}: the name is in ${titleStyle.fontFamily}`);
      // Every element of the row's text with words of its own, outside the name.
      for (const other of element.querySelectorAll('.project__text *')) {
        if (title.contains(other)) continue;
        const words = [...other.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (!words || other.closest('[hidden]') || getComputedStyle(other).display === 'none') continue;
        const otherSize = parseFloat(getComputedStyle(other).fontSize);
        if (size < 1.5 * otherSize) problems.push(`${name}: "${other.textContent.trim().slice(0, 30)}" is ${otherSize}px beside a name of ${size}px`);
      }
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement('i');
      document.body.append(probe);
      probe.style.color = root.getPropertyValue('--ink');
      const ink = getComputedStyle(probe).color;
      probe.remove();
      const part = getComputedStyle(element.querySelector('.project__part p')).color;
      if (part !== ink) problems.push(`${name}: my part is in ${part}, not in ink (${ink})`);
      return problems;
    });
    expect(found).toEqual([]);
  }
});

// The first screen (tracker F45): the role line stands under the name, as the caption under a drawing, and there is
// one way on as a button, to the work; "Get in touch" is a plain link beside it. Before, the role stood above the
// name and two buttons, one filled and one outlined, stood side by side.
test('the first screen has the role under the name and one button, with Get in touch as a link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const hero = page.locator('#top');
  const name = await hero.locator('h1').boundingBox();
  const role = await hero.locator('.hero__role').boundingBox();
  expect(role.y, 'the role line under the name').toBeGreaterThanOrEqual(name.y + name.height - 1);
  await expect(hero.locator('.button')).toHaveCount(1);
  await expect(hero.locator('.button')).toHaveText('See the work');
  const contact = hero.getByRole('link', { name: 'Get in touch' });
  await expect(contact).toHaveAttribute('href', '#contact');
  const look = await contact.evaluate((link) => {
    const style = getComputedStyle(link);
    return { button: link.classList.contains('button'), underline: style.textDecorationLine, border: style.borderTopWidth };
  });
  expect(look).toEqual({ button: false, underline: 'underline', border: '0px' });
});

// The star on a phone (tracker F46): small and at full strength under the buttons, in the band, at the right. Before,
// it was enlarged behind the name at 22 % opacity, its lines across the name, the role and the headline.
test('on a phone the star stands under the buttons at full strength and crosses no text', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'a wide screen has the star beside the name');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const found = await page.locator('#top').evaluate((hero) => {
    const drawing = hero.querySelector('.hero__drawing');
    const box = (element) => element.getBoundingClientRect();
    const star = box(drawing);
    const texts = [...hero.querySelectorAll('h1, .hero__role, .hero__headline, .hero__actions')].map((element) => ({ name: element.className || element.tagName, box: box(element) }));
    const crossed = texts.filter(({ box: text }) => star.left < text.right && star.right > text.left && star.top < text.bottom && star.bottom > text.top).map(({ name }) => name);
    return {
      opacity: getComputedStyle(drawing).opacity,
      crossed,
      belowButtons: star.top >= box(hero.querySelector('.hero__actions')).bottom,
      inBand: star.bottom <= box(hero).bottom + 1,
      onScreen: star.left >= 0 && star.right <= document.documentElement.clientWidth,
    };
  });
  expect(found).toEqual({ opacity: '1', crossed: [], belowButtons: true, inBand: true, onScreen: true });

  // A tablet has room beside the text: there the star stands beside the headline and the buttons, under the name.
  await page.setViewportSize({ width: 768, height: 1024 });
  const tablet = await page.locator('#top').evaluate((hero) => {
    const box = (selector) => hero.querySelector(selector).getBoundingClientRect();
    const star = box('.hero__drawing');
    return {
      opacity: getComputedStyle(hero.querySelector('.hero__drawing')).opacity,
      besideText: ['.hero__role', '.hero__headline', '.hero__actions'].every((selector) => star.left >= box(selector).right),
      underName: star.top >= box('h1').bottom,
      inBand: star.bottom <= box('.hero__grid').bottom + 1,
    };
  });
  expect(tablet).toEqual({ opacity: '1', besideText: true, underName: true, inBand: true });
});

// The dark theme is a blueprint (tracker F47): deep blueprint blue with a faint grid of drawing paper behind the page,
// and bands that stand apart from the ground. Before, it was navy with lavender text, and a tinted band differed from
// the ground by 1.06. axe cannot measure text over a background image, so its helper takes the grid away while it
// measures (support.js); this test proves the grid is too faint to change what it would find.
test('the dark theme is a blueprint: a faint grid on the ground, bands that stand apart, text that keeps its contrast', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await open(page);
  const problems = await page.evaluate(() => {
    const found = [];
    if (document.documentElement.dataset.theme !== 'dark') found.push(`the theme is ${document.documentElement.dataset.theme}`);
    const probe = document.createElement('i');
    document.body.append(probe);
    const rgba = (value) => {
      probe.style.color = '';
      probe.style.color = value;
      const [r, g, b, a = 1] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
      return { rgb: [r, g, b], a };
    };
    const root = getComputedStyle(document.documentElement);
    const token = (name) => rgba(root.getPropertyValue(name).trim() || 'transparent');
    const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (x, y) => (Math.max(lum(x), lum(y)) + 0.05) / (Math.min(lum(x), lum(y)) + 0.05);
    const over = (base, white) => base.map((c) => c * (1 - white) + 255 * white);

    // The grid: two sets of lines on the ground, faint even where a fine and a strong line cross.
    const image = getComputedStyle(document.body).backgroundImage;
    if ((image.match(/linear-gradient/g) ?? []).length < 4) found.push(`the ground has no grid: ${image}`);
    const minor = token('--grid-minor');
    const major = token('--grid-major');
    const both = 1 - (1 - minor.a) * (1 - major.a);
    if (minor.a === 0 || major.a === 0) found.push('the grid tokens are missing');
    if (both > 0.08) found.push(`the grid is too strong: ${both.toFixed(3)} white where its lines cross`);

    // The bands stand apart from the ground.
    const ground = token('--ground').rgb;
    const tint = rgba(getComputedStyle(document.querySelector('.section--tinted')).backgroundColor).rgb;
    if (ratio(tint, ground) < 1.2) found.push(`a tinted band differs from the ground by ${ratio(tint, ground).toFixed(2)}`);

    // Text keeps its contrast on the ground with a grid line under it, and on a band.
    const needs = { '--ink': 4.5, '--muted': 4.5, '--title': 4.5, '--link': 4.5, '--error': 4.5, '--success': 4.5, '--field-border': 3 };
    for (const [name, least] of Object.entries(needs)) {
      for (const [where, background] of [['the ground under a grid line', over(ground, both)], ['a tinted band', tint]]) {
        const value = ratio(token(name).rgb, background);
        if (value < least) found.push(`${name} on ${where}: ${value.toFixed(2)}`);
      }
    }
    probe.remove();
    return found;
  });
  expect(problems).toEqual([]);
});
