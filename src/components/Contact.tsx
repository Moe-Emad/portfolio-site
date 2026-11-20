import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { content } from '../content/index.ts';
import { contactSettings, fieldErrors, LIMITS, looksLikeBot, sendMessage } from '../lib/contact.js';
import SectionTitle from './SectionTitle.tsx';

type Status = 'idle' | 'sending' | 'sent' | 'failed';
type Fields = { name: string; email: string; message: string; company: string };
type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

const EMPTY: Fields = { name: '', email: '', message: '', company: '' };

/** The contact form (rules in src/lib/contact.js) and the other ways to reach me. */
export default function Contact() {
  const { links } = content.profile;
  const settings = contactSettings(import.meta.env);
  const [status, setStatus] = useState<Status>('idle');
  const [form, setForm] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (name in errors) setErrors({ ...errors, [name]: undefined });
    if (status === 'sent' || status === 'failed') setStatus('idle');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending' || !settings) return;

    const found: Errors = fieldErrors(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      // Put the cursor in the first field that needs attention.
      event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    // A program filled in the field no person can see: answer as if it had worked, send nothing.
    if (looksLikeBot(form)) {
      setForm(EMPTY);
      setStatus('sent');
      return;
    }

    setStatus('sending');
    try {
      await sendMessage(form, settings);
      setForm(EMPTY);
      setStatus('sent');
    } catch {
      // The text stays in the form, so nothing has to be typed again.
      setStatus('failed');
    }
  };

  const describedBy = (field: keyof Errors) => (errors[field] ? `${field}-error` : undefined);

  return (
    <section id="contact" className="section" aria-labelledby="contact-title">
      <div className="wrap contact">
        <div className="contact__intro" data-animate="rise">
          <SectionTitle id="contact-title">
            Get in touch
          </SectionTitle>
          <p>
            Have a project that needs building, or an older one that needs bringing up to date? Write a few lines
            about it and I will reply by email.
          </p>
          <ul className="contact__links">
            <li>
              <a href={links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            {links.github && (
              <li>
                <a href={links.github} target="_blank" rel="noreferrer">
                  GitHub<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
          </ul>
        </div>

        {settings ? (
          <form onSubmit={handleSubmit} noValidate className="form" data-animate="rise">
            <div className="field field--half">
              <label htmlFor="name">Your name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={LIMITS.name}
                required
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy('name')}
              />
              {errors.name && (
                <p id="name-error" className="form-error">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="field field--half">
              <label htmlFor="email">Your email address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                maxLength={LIMITS.email}
                required
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy('email')}
              />
              {errors.email && (
                <p id="email-error" className="form-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="message">Your message</label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={6}
                maxLength={LIMITS.message}
                required
                aria-invalid={Boolean(errors.message)}
                aria-describedby={describedBy('message')}
              />
              {errors.message && (
                <p id="message-error" className="form-error">
                  {errors.message}
                </p>
              )}
            </div>

            {/* The bot trap: off-screen, out of the tab order and hidden from screen readers. */}
            <div className="form-trap" aria-hidden="true">
              <label htmlFor="company">Company (leave this empty)</label>
              <input
                type="text"
                id="company"
                name="company"
                value={form.company}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <button type="submit" className="button button--primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send message'}
            </button>

            {/* Always in the page, so a screen reader announces the text when it appears. */}
            <div role="status" aria-live="polite" className="form-status">
              {status === 'sent' && (
                <p className="form-success">Thank you - your message is on its way. I will reply by email.</p>
              )}
            </div>
            {status === 'failed' && (
              <p role="alert" className="form-error">
                The message could not be sent. Try again in a moment, or write to me on{' '}
                <a href={links.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                . Your text is still in the form.
              </p>
            )}
          </form>
        ) : (
          <p className="form-notice" data-contact="not-set-up">
            The contact form is not set up on this copy of the site. Please write to me on{' '}
            <a href={links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}
