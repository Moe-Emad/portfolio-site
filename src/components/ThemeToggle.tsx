import { useEffect, useState } from 'react';
import { currentTheme, THEME_EVENT, toggleTheme } from '../lib/theme.js';

type Theme = 'light' | 'dark';

/**
 * Switches between the light and the dark theme (src/lib/theme.js). The button follows the theme also when it
 * is changed elsewhere, for example from the command palette.
 */
export default function ThemeToggle() {
  // Unknown until the page runs in a browser.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const read = () => setTheme(currentTheme());
    read();
    document.addEventListener(THEME_EVENT, read);
    return () => document.removeEventListener(THEME_EVENT, read);
  }, []);

  const other: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button type="button" className="theme-toggle" onClick={() => toggleTheme()} aria-label={`Switch to the ${other} theme`}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        {theme === 'dark' ? (
          // Sun: the way back to the light theme.
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </g>
        ) : (
          // Crescent: the way to the dark theme.
          <path
            d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <span className="theme-toggle__text">{other === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
