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

// Smaller and earlier work as a sheet of cells (tracker F22).
test.describe('the smaller and earlier work', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('is a sheet of cells, four across on a wide screen, each with its name, description and tools', async ({ page }) => {
    await page.goto('/');
    const sheet = page.locator('#work .archive');
    const columns = await sheet.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(4);
    const cells = sheet.locator(':scope > li');
    const count = await cells.count();
    expect(count).toBeGreaterThan(3);
    for (let index = 0; index < count; index += 1) {
      const cell = cells.nth(index);
      await expect(cell.locator('.archive__name')).not.toBeEmpty();
      await expect(cell.locator('.archive__summary')).not.toBeEmpty();
      await expect(cell.locator('.archive__tech')).not.toBeEmpty();
      await expect(cell.locator('svg.archive__mark')).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

// Content rises into place as you scroll (tracker F23).
test.describe('scrolling', () => {
  test('blocks further down wait below the screen and rise into place as they come into view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    for (const selector of ['#experience .job', '#skills .skill-group', '#work .archive > li', '#method .steps > li']) {
      const block = page.locator(selector).first();
      await expect(block, selector).toHaveAttribute('data-reveal', 'waiting');
      await block.scrollIntoViewIfNeeded();
      await expect(block, selector).toHaveAttribute('data-reveal', 'shown');
    }
  });

  test('the figures of the record count up to their real value', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    const figures = page.locator('#method .record dt');
    const real = await figures.allInnerTexts();
    await page.locator('#method .record').scrollIntoViewIfNeeded();
    await expect(figures.first()).toHaveAttribute('data-counted', 'true');
    await expect(figures).toHaveText(real);
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

// Two corner radii (tracker F37): a small one for what is clicked or typed into and for the focus ring, a large one
// for frames (screenshots, the palette). Both are tokens at the top of src/index.css.
test.describe('corners', () => {
  const RADII = ['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];

  test('every radius in the stylesheet, in any state, is one of the two tokens', async ({ page }) => {
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
            if (['', '0', '0px', 'var(--radius)', 'var(--radius-frame)'].includes(value)) continue;
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
    test(`on ${path} every corner is square, small or large`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const { small, large, found } = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const small = root.getPropertyValue('--radius').trim();
        const large = root.getPropertyValue('--radius-frame').trim();
        const allowed = new Set(['0px', small, large]);
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
      const row = rows.nth(index);
      const columns = await row.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      expect(columns, group.group).toBe(2);
      await expect(row.locator('ul > li')).toHaveText(group.skills);
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
