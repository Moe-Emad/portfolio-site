// The rules of the contact form (tracker B3), kept apart from the page so they can be tested without a browser.

export const LIMITS = { name: 100, email: 254, message: 5000 };

/**
 * The EmailJS settings from the build environment (.env), or null when one is missing.
 * Without all three the form cannot send, and it says so instead of failing silently.
 */
export function contactSettings(env) {
  const settings = {
    serviceId: env?.VITE_APP_EMAILJS_SERVICE_ID,
    templateId: env?.VITE_APP_EMAILJS_TEMPLATE_ID,
    publicKey: env?.VITE_APP_EMAILJS_PUBLIC_KEY,
  };
  return Object.values(settings).every((value) => typeof value === 'string' && value.trim() !== '') ? settings : null;
}

/**
 * The form has a field no person can see ("company"). A program that fills in every field gives itself away.
 */
export function looksLikeBot(fields) {
  return typeof fields.company === 'string' && fields.company.trim() !== '';
}

/** What is wrong with the fields, as { field: message }. An empty object means the message can go out. */
export function fieldErrors(fields) {
  const errors = {};
  const name = (fields.name ?? '').trim();
  const email = (fields.email ?? '').trim();
  const message = (fields.message ?? '').trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length > LIMITS.name) errors.name = `Please keep the name under ${LIMITS.name} characters.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'This does not look like an email address.';
  }

  if (!message) errors.message = 'Please write a message.';
  else if (message.length > LIMITS.message) errors.message = `Please keep the message under ${LIMITS.message} characters.`;

  return errors;
}

/**
 * Sends the message through EmailJS. The EmailJS code is loaded here, on the first send, so visitors who never
 * use the form do not download it. Only the three visible fields are sent.
 * Throws when EmailJS refuses or cannot be reached.
 */
export async function sendMessage(fields, settings) {
  const { default: emailjs } = await import('@emailjs/browser');
  await emailjs.send(
    settings.serviceId,
    settings.templateId,
    { name: fields.name.trim(), email: fields.email.trim(), message: fields.message.trim() },
    { publicKey: settings.publicKey },
  );
}
