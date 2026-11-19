import { useEffect, useId, useState } from 'react';
import { content } from '../content/index.ts';
import CommandPalette from './CommandPalette.tsx';
import ThemeToggle from './ThemeToggle.tsx';

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'method', label: 'How I work' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];

/**
 * The bar at the top: the name, the sections, the theme switch. On a phone the sections fold into a menu.
 * home: on the home page the links jump within the page; on any other page they lead back to it.
 */
export default function Header({ home }: { home: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const base = home ? '' : '/';

  // Escape closes the menu, wherever the cursor is.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="wrap site-header__bar">
        <a href={home ? '#top' : '/'} className="site-header__name">
          {content.profile.name}
        </a>

        <CommandPalette home={home} sections={SECTIONS} />

        <button
          type="button"
          className="site-header__menu-button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav id={menuId} className="site-nav" data-open={open} aria-label={home ? 'Sections of this page' : 'Sections of the home page'}>
          <ul>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`${base}#${section.id}`} onClick={() => setOpen(false)}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
