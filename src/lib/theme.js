// The theme of the page (tracker F2, shared since F7 by the button in the bar and the command palette).
// The theme itself is set by a small script in index.html before the first paint; these functions read it,
// change it, remember the choice and tell every part of the page that shows it.

/** The event that says the theme has changed. Listen on document. */
export const THEME_EVENT = 'themechange';

/** 'light' or 'dark', as the page is showing now. Browser only. */
export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Shows the given theme, remembers it for the next visit and announces the change. Browser only. */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Private windows may refuse storage; the theme still changes for this visit.
  }
  document.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Switches to the other theme and returns it. Browser only.
 * from: the point the change starts from, in the window (tracker F68) - the button that was pressed. Where the
 * browser has view transitions and motion is welcome, the new colours spread over the page as a circle from there;
 * elsewhere the theme changes at once.
 */
export function toggleTheme(from) {
  const other = currentTheme() === 'dark' ? 'light' : 'dark';
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || still) {
    applyTheme(other);
    return other;
  }
  const root = document.documentElement.style;
  root.setProperty('--theme-x', `${Math.round(from?.x ?? window.innerWidth / 2)}px`);
  root.setProperty('--theme-y', `${Math.round(from?.y ?? window.innerHeight / 2)}px`);
  document.startViewTransition(() => applyTheme(other));
  return other;
}
