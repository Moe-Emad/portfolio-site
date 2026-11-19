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
