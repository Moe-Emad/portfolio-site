// Unit tests of the contact form rules (tracker B3): npm run test:unit
import assert from 'node:assert/strict';
import test from 'node:test';
import { contactSettings, fieldErrors, LIMITS, looksLikeBot } from './contact.js';

const FULL = {
  VITE_APP_EMAILJS_SERVICE_ID: 'service',
  VITE_APP_EMAILJS_TEMPLATE_ID: 'template',
  VITE_APP_EMAILJS_PUBLIC_KEY: 'key',
};
const GOOD = { name: 'Sara Ali', email: 'sara@example.com', message: 'Hello, I have a project for you.' };

test('settings: all three values give the settings', () => {
  assert.deepEqual(contactSettings(FULL), { serviceId: 'service', templateId: 'template', publicKey: 'key' });
});

test('settings: a missing or empty value means the form is not set up', () => {
  for (const key of Object.keys(FULL)) {
    assert.equal(contactSettings({ ...FULL, [key]: undefined }), null, `${key} missing`);
    assert.equal(contactSettings({ ...FULL, [key]: '  ' }), null, `${key} blank`);
  }
  assert.equal(contactSettings({}), null);
  assert.equal(contactSettings(undefined), null);
});

test('fields: a complete message has no errors', () => {
  assert.deepEqual(fieldErrors(GOOD), {});
});

test('fields: each empty field is named', () => {
  assert.deepEqual(Object.keys(fieldErrors({ name: ' ', email: '', message: '\n' })), ['name', 'email', 'message']);
});

test('fields: an address without a domain is refused', () => {
  for (const email of ['sara', 'sara@', 'sara@example', '@example.com', 'sa ra@example.com']) {
    assert.ok(fieldErrors({ ...GOOD, email }).email, email);
  }
  assert.equal(fieldErrors({ ...GOOD, email: 'sara.ali+work@mail.example.co' }).email, undefined);
});

test('fields: over-long input is refused', () => {
  assert.ok(fieldErrors({ ...GOOD, name: 'a'.repeat(LIMITS.name + 1) }).name);
  assert.ok(fieldErrors({ ...GOOD, message: 'a'.repeat(LIMITS.message + 1) }).message);
  assert.deepEqual(fieldErrors({ ...GOOD, message: 'a'.repeat(LIMITS.message) }), {});
});

test('bot trap: a filled hidden field gives a bot away, an empty one does not', () => {
  assert.equal(looksLikeBot({ ...GOOD, company: 'ACME Ltd' }), true);
  assert.equal(looksLikeBot({ ...GOOD, company: '' }), false);
  assert.equal(looksLikeBot(GOOD), false);
});
