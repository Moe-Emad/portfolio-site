import { useState } from 'react';

/**
 * The email address (tracker F62): a link that opens a new message, and a button that copies the address, for a
 * visitor who writes from another program or passes it on. The button says when it is copied; a screen reader hears
 * it from a live region. Where the clipboard cannot be used, the button asks to copy the address by hand.
 */
export default function EmailAddress({ address }: { address: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2500);
  };

  return (
    <span className="email">
      <a href={`mailto:${address}`} className="email__address">
        {address}
      </a>
      <button type="button" className="email__copy" onClick={copy}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select the address to copy it' : 'Copy'}
        <span className="sr-only"> the email address</span>
      </button>
      {/* A live region of its own, not a second status of the contact form. */}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'The email address is copied.' : ''}
      </span>
    </span>
  );
}
