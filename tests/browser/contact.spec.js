// The contact form (tracker B3). The test build has made-up EmailJS settings (tools/dev/browser-tests.cjs) and
// every request to EmailJS is answered here, so no mail is ever sent.
import { expect, test } from '@playwright/test';

const EMAILJS = '**/api.emailjs.com/**';

/** Opens the page, answers EmailJS with the given status and returns the list of requests that reach it. */
async function openForm(page, status = 200) {
  const requests = [];
  await page.route(EMAILJS, async (route) => {
    requests.push(route.request());
    await route.fulfill({ status, contentType: 'text/plain', body: status === 200 ? 'OK' : 'refused' });
  });
  await page.goto('/');
  await expect(page.locator('#contact form')).toBeVisible();
  return requests;
}

async function fill(page, { name = 'Sara Ali', email = 'sara@example.com', message = 'Hello, I have a project for you.' } = {}) {
  await page.getByLabel(/name/i).fill(name);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/message/i).fill(message);
}

const send = (page) => page.locator('#contact form button[type="submit"]').click();

test('a sent message is confirmed and the form is emptied', async ({ page }) => {
  const requests = await openForm(page, 200);
  await fill(page);
  await send(page);

  await expect(page.locator('#contact [role="status"]')).toContainText(/on its way|sent|thank you/i);
  await expect(page.getByLabel(/message/i)).toHaveValue('');
  expect(requests).toHaveLength(1);
  const body = requests[0].postDataJSON();
  expect(body.service_id).toBe('e2e_service');
  expect(body.template_id).toBe('e2e_template');
  expect(body.template_params).toEqual({ name: 'Sara Ali', email: 'sara@example.com', message: 'Hello, I have a project for you.' });
});

test('a failed send is reported and the text stays in the form', async ({ page }) => {
  await openForm(page, 500);
  await fill(page);
  await send(page);

  await expect(page.locator('#contact [role="alert"]')).toContainText(/could not be sent/i);
  await expect(page.getByLabel(/message/i)).toHaveValue('Hello, I have a project for you.');
  await expect(page.locator('#contact form button[type="submit"]')).toBeEnabled();
});

test('empty and wrong fields are named, and nothing is sent', async ({ page }) => {
  const requests = await openForm(page, 200);
  await fill(page, { name: '', email: 'sara@', message: '' });
  await send(page);

  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#email-error')).toContainText(/email address/i);
  await expect(page.locator('#message-error')).toBeVisible();
  await expect(page.getByLabel(/name/i)).toBeFocused();
  await expect(page.getByLabel(/email/i)).toHaveAttribute('aria-invalid', 'true');
  expect(requests).toHaveLength(0);
});

test('a program that fills in the hidden field sends nothing', async ({ page }) => {
  const requests = await openForm(page, 200);
  await fill(page);
  // No person can see or reach this field; a program finds it in the HTML.
  await page.locator('#contact input[name="company"]').evaluate((input) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setValue.call(input, 'ACME Ltd');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await send(page);

  await expect(page.locator('#contact [role="status"]')).toContainText(/on its way|sent|thank you/i);
  expect(requests).toHaveLength(0);
});

test('the hidden field is out of sight and out of the tab order', async ({ page }) => {
  await openForm(page);
  const trap = page.locator('#contact input[name="company"]');
  await expect(trap).not.toBeInViewport();
  await expect(trap).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('#contact .form-trap')).toHaveAttribute('aria-hidden', 'true');
});

// After a failed send the cursor goes to the first field with a problem (tracker B10). When that field is just under
// the bar at the top, the browser scrolls only as far as the field needs; its label must not stay under the bar.
test('after a failed send, the first field and its label come out from under the bar', async ({ page }) => {
  // "Reduce motion" makes the page scroll at once, so what is measured is where the scroll ends.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: page.viewportSize().width, height: 600 });
  await openForm(page);
  const places = () =>
    page.evaluate(() => ({
      bar: Math.round(document.querySelector('.site-header').getBoundingClientRect().bottom),
      label: Math.round(document.querySelector('label[for="name"]').getBoundingClientRect().top),
    }));
  // The first field 20 px from the top: on the screen, but it and its label are under the bar.
  await page.evaluate(() => {
    const field = document.getElementById('name');
    window.scrollBy({ top: field.getBoundingClientRect().top - 20, behavior: 'instant' });
  });
  const start = await places();
  expect(start.label, 'the label is not under the bar to begin with, so the test proves nothing').toBeLessThan(start.bar);

  // Sent without a click, which would scroll the page to the button first.
  await page.locator('#contact form').evaluate((form) => form.requestSubmit());
  await expect(page.locator('#name')).toBeFocused();
  // Wait until two looks a quarter of a second apart agree.
  let last = null;
  await expect
    .poll(async () => {
      const now = await places();
      const still = last !== null && now.label === last.label;
      last = now;
      return still;
    }, { intervals: [250] })
    .toBe(true);
  expect(last.label).toBeGreaterThanOrEqual(last.bar);
});

// The fields for a name and an email address hold a few words: on a wide screen they stand side by side, half the
// width of the form each, and the message keeps the full width (tracker F42). Before, each was 924 px wide at 1920.
test('on a wide screen the name and the email address stand side by side, the message under them', async ({ page }, testInfo) => {
  const sizes = testInfo.project.name === 'phone' ? [null] : [{ width: 1920, height: 1080 }, { width: 1280, height: 800 }];
  // The fields where they stand, not while the form rises into view.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    await openForm(page);
    const boxes = await page.locator('#contact form').evaluate((form) => {
      const box = (element) => {
        const rect = element.getBoundingClientRect();
        return { top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), left: Math.round(rect.left), width: Math.round(rect.width) };
      };
      const field = (id) => box(form.querySelector(`#${id}`));
      return { form: box(form), name: field('name'), email: field('email'), message: field('message') };
    });
    const rem = 16;
    if (size) {
      expect(boxes.email.top, `${size.width}: on one line`).toBe(boxes.name.top);
      expect(boxes.email.left, `${size.width}: the email address right of the name`).toBeGreaterThan(boxes.name.right);
      for (const field of ['name', 'email']) expect(boxes[field].width, `${size.width}: ${field}`).toBeLessThanOrEqual(36 * rem);
      expect(boxes.message.top, `${size.width}: the message under both`).toBeGreaterThan(boxes.name.bottom);
      expect(boxes.message.width, `${size.width}: the message as wide as the form`).toBe(boxes.form.width);
    } else {
      expect(boxes.email.top, 'on a phone the email address under the name').toBeGreaterThan(boxes.name.bottom);
    }
  }
});
