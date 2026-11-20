// The project pages (tracker F3): every project in content/projects has a page that loads, shows its pictures
// and passes axe; the home page leads to each of them; the filter and the "not found" page work.
import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { axeFindings, expectNoProblems, watchPage } from './support.js';

const drafts = fs
  .readdirSync('content/projects')
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
  .filter((project) => project.draft === true);

const projects = fs
  .readdirSync('content/projects')
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(`content/projects/${name}`, 'utf8')))
  // A draft is left out of the site (tracker F17).
  .filter((project) => project.draft !== true);

/** Scrolls through the page so that pictures which load "when they come near" do load. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.75) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  });
}

test('there are projects to test', () => {
  expect(projects.length).toBeGreaterThan(3);
});

for (const project of projects) {
  test.describe(`the page of ${project.title}`, () => {
    test('loads without errors, with its title, its text and a tab title of its own', async ({ page }) => {
      const problems = watchPage(page);
      await page.goto(`/work/${project.slug}/`);
      await expect(page.locator('h1')).toContainText(project.title);
      await expect(page).toHaveTitle(new RegExp(`^${project.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - `));
      await expect(page.locator('main')).toContainText(project.summary);
      await expect(page.locator('main')).toContainText(project.highlights[0].title);
      expectNoProblems(problems);
    });

    test('shows every picture, each with a description and its size', async ({ page }) => {
      await page.goto(`/work/${project.slug}/`);
      await expect(page.locator('h1')).toBeVisible();
      const pictures = page.locator('main img');
      await expect(pictures).toHaveCount(project.images.length);
      await scrollThrough(page);
      for (const image of project.images) {
        const picture = page.locator(`main img[src="${image.src}"]`);
        await expect(picture).toHaveAttribute('alt', image.alt);
        await expect(picture).toHaveAttribute('width', String(image.width));
        await expect.poll(() => picture.evaluate((element) => element.complete && element.naturalWidth > 0), { message: `${image.src} loaded` }).toBe(true);
      }
    });

    test('is not wider than the screen and passes axe', async ({ page }) => {
      await page.goto(`/work/${project.slug}/`);
      await expect(page.locator('h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'horizontal scroll in pixels').toBeLessThanOrEqual(0);
      expect(await axeFindings(page)).toEqual([]);
    });
  });
}

// The points worth a closer look (tracker F30): each sits under a hairline in the colour of the other rules of the
// page, as the figures and the rows of the work do; there is no stripe down the side.
for (const colorScheme of ['light', 'dark']) {
  test(`in the ${colorScheme} theme each point worth a closer look has a hairline above it and no stripe at its side`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(`/work/${projects[0].slug}/`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    const { line, points } = await page.locator('.highlights > li').evaluateAll((items) => {
      // The colour of the --line token, as the browser computes it.
      const ruler = document.createElement('div');
      ruler.style.borderTop = '1px solid var(--line)';
      document.body.append(ruler);
      const colour = getComputedStyle(ruler).borderTopColor;
      ruler.remove();
      return {
        line: colour,
        points: items.map((item) => {
          const style = getComputedStyle(item);
          return {
            title: item.querySelector('h3')?.textContent,
            top: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
            sides: `${style.borderLeftWidth} ${style.borderRightWidth}`,
          };
        }),
      };
    });
    expect(points.map((point) => point.title)).toEqual(projects[0].highlights.map((highlight) => highlight.title));
    for (const point of points) {
      expect(point.top, `the line above "${point.title}"`).toBe(`1px solid ${line}`);
      expect(point.sides, `the borders at the sides of "${point.title}"`).toBe('0px 0px');
    }
  });
}

test('a project page passes axe in the dark theme too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`/work/${projects[0].slug}/`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await axeFindings(page)).toEqual([]);
});

test('the home page links to the page of every project, and the page leads back to the work', async ({ page }) => {
  await page.goto('/');
  for (const project of projects) {
    await expect(page.locator(`#work a[href="/work/${project.slug}/"]`), project.title).toHaveCount(1);
  }
  const first = projects.find((project) => project.order === Math.min(...projects.map((other) => other.order)));
  await page.locator(`#work a[href="/work/${first.slug}/"]`).click();
  await expect(page).toHaveURL(new RegExp(`/work/${first.slug}/$`));
  await expect(page.locator('h1')).toContainText(first.title);

  await page.getByRole('link', { name: 'All work' }).click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator('#work .project')).toHaveCount(projects.length);
});

test('a project page leads on to the next project', async ({ page }) => {
  const ordered = [...projects].sort((a, b) => a.order - b.order);
  await page.goto(`/work/${ordered[0].slug}/`);
  await page.getByRole('navigation', { name: 'More work' }).getByRole('link').click();
  await expect(page.locator('h1')).toContainText(ordered[1].title);
});

test('the menu of a project page leads to the sections of the home page', async ({ page }, testInfo) => {
  await page.goto(`/work/${projects[0].slug}/`);
  if (testInfo.project.name === 'phone') await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('navigation', { name: 'Sections of the home page' }).getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.locator('#contact')).toBeInViewport();
});

// The head of "Selected work" (tracker F19): tabs by kind of work, each with its count.
test('the tabs show the projects of one kind with their count, and All brings them back', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#work .project');
  const tabs = page.getByRole('group', { name: 'Show the work of one kind' });
  await expect(rows).toHaveCount(projects.length);
  await expect(tabs.getByRole('button', { name: `All ${projects.length}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#work [role="status"]')).toHaveText(`All ${projects.length} projects.`);

  const expected = projects.filter((project) => project.kind === 'Client work');
  expect(expected.length, 'client projects for this test').toBeGreaterThan(1);
  const button = tabs.getByRole('button', { name: `Client work ${expected.length}`, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveCount(expected.length);
  for (const project of expected) await expect(page.locator(`#work a[href="/work/${project.slug}/"]`)).toBeVisible();
  await expect(page.locator('#work [role="status"]')).toHaveText(`${expected.length} of ${projects.length} projects: client work.`);

  await tabs.getByRole('button', { name: `All ${projects.length}`, exact: true }).click();
  await expect(rows).toHaveCount(projects.length);
  // No technology buttons any more: search (Ctrl K) finds projects by technology.
  await expect(page.getByRole('group', { name: 'Show the projects built with' })).toHaveCount(0);
});

test('an address that does not exist says so and offers the way on', async ({ page }) => {
  await page.goto('/work/no-such-project/');
  await expect(page.locator('h1')).toHaveText('This page does not exist');
  await expect(page).toHaveTitle(/^Page not found - /);
  expect(await axeFindings(page)).toEqual([]);
  await page.getByRole('link', { name: 'Go to the home page' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('h1')).toContainText('Mohammed');
});

// A project marked as a draft keeps its file but is left out of the site (tracker F17).
test('a draft project has no page and is named nowhere on the site', async ({ page }) => {
  expect(drafts.length, 'this test needs at least one draft in content/projects').toBeGreaterThan(0);
  for (const draft of drafts) {
    await page.goto(`/work/${draft.slug}/`);
    await expect(page.locator('h1')).toHaveText('This page does not exist');
    for (const address of ['/', '/work/no-such-page/']) {
      await page.goto(address);
      await expect(page.locator('main')).not.toContainText(draft.title);
    }
  }
});

// The list of work has a page of its own (tracker B6).
test('/work/ lists every project and the earlier work, and passes axe', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('h1')).toHaveText('Selected work');
  await expect(page).toHaveTitle(/^Work - /);
  for (const project of projects) await expect(page.locator(`#work a[href="/work/${project.slug}/"]`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Smaller and earlier work' })).toBeVisible();
  expect(await axeFindings(page)).toEqual([]);
});

// Each row of the list says more than one sentence (tracker F25), all from the project's own content.
test('each row of the list shows the figures of its project and my part in it', async ({ page }, testInfo) => {
  await page.goto('/work/');
  await scrollThrough(page);
  for (const project of projects) {
    const row = page.locator('#work .project').filter({ has: page.locator(`a[href="/work/${project.slug}/"]`) });
    const figures = row.locator('.project__facts dt');
    // The figures may still be counting up: the expectation waits until they show their real values.
    await expect(figures).toHaveText(project.facts.map((fact) => fact.value));
    await expect(row.locator('.project__facts dd')).toHaveText(project.facts.map((fact) => fact.label));
    // Only whole numbers count up: a range such as "10 to 13" must never run through 1013.
    for (const [index, fact] of project.facts.entries()) {
      expect(await figures.nth(index).getAttribute('data-count'), `${project.title}: ${fact.value}`).toBe(/^\d+$/.test(fact.value) ? 'true' : null);
    }
    await expect(row.getByRole('heading', { name: 'My part', level: 4 })).toBeVisible();
    await expect(row.locator('.project__part p')).toHaveText(project.role);
    // On a phone the picture sits under the text, so the row stays short: the points are on the project's page.
    if (testInfo.project.name === 'phone') await expect(row.locator('.project__points')).toBeHidden();
  }
  // The row is one link over the whole row: a click on its picture or its details opens the project too. Before
  // F25 the picture, lifted under the mouse, was drawn over the link and a click on it did nothing.
  const second = [...projects].sort((a, b) => a.order - b.order)[1];
  for (const part of ['.shot', '.project__details']) {
    await page.goto('/work/');
    const target = page.locator('#work .project').nth(1).locator(part);
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page, `a click on ${part}`).toHaveURL(new RegExp(`/work/${second.slug}/$`));
  }
});

test('beside its picture, a row also names its points, and its text fills the height of the picture', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'a phone shows the picture under the text');
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/work/');
    await scrollThrough(page);
    for (const project of projects) {
      const row = page.locator('#work .project').filter({ has: page.locator(`a[href="/work/${project.slug}/"]`) });
      if (width === 1920) {
        await expect(row.getByRole('heading', { name: 'Worth a closer look', level: 4 })).toBeVisible();
        await expect(row.locator('.project__points li')).toHaveText(project.highlights.slice(0, 4).map((point) => point.title));
      }
      const text = await row.locator('.project__text').boundingBox();
      const picture = await row.locator('.shot').boundingBox();
      const fill = text.height / picture.height;
      expect(fill, `${project.title} at ${width} px: the text is ${Math.round(fill * 100)}% of the picture's height`).toBeGreaterThan(0.7);
      expect(fill, `${project.title} at ${width} px: the text is ${Math.round(fill * 100)}% of the picture's height`).toBeLessThan(1.3);
    }
  }
});

// Since F18 the picture of a row is up to about 58rem wide, but "sizes" still said 42rem: the browser chose a
// smaller file and stretched it. Now the file is at least as wide as the picture is shown (tracker F25).
test('on a wide screen the picture of each row is loaded at least as wide as it is shown', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'about wide screens');
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto('/work/');
  await scrollThrough(page);
  await expect(page.locator('#work .project .shot img')).toHaveCount(projects.length);
  for (const project of projects) {
    const picture = page.locator('#work .project').filter({ has: page.locator(`a[href="/work/${project.slug}/"]`) }).locator('.shot img');
    await picture.scrollIntoViewIfNeeded();
    await expect.poll(() => picture.evaluate((image) => image.complete && image.currentSrc !== ''), { timeout: 15000 }).toBe(true);
    // naturalWidth of a picture chosen from a srcset is already scaled by "sizes", so the file is opened on its own.
    const [file, shown, src] = await picture.evaluate(async (image) => {
      const copy = new Image();
      copy.src = image.currentSrc;
      await copy.decode();
      return [copy.naturalWidth, image.getBoundingClientRect().width, image.currentSrc];
    });
    // A picture that was taken smaller than it is shown can only be loaded whole.
    const best = Math.min(Math.floor(shown), project.images[0].width);
    expect(file, `${src}: a file ${file} px wide, shown ${Math.round(shown)} px wide`).toBeGreaterThanOrEqual(best);
  }
});

test('"All work" on a project page leads to the list of work', async ({ page }) => {
  await page.goto(`/work/${projects[0].slug}/`);
  await page.getByRole('link', { name: 'All work' }).click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator('h1')).toHaveText('Selected work');
});
