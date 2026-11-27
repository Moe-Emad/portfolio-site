import { useEffect, useId, useState } from 'react';
import { content } from '../content/index.ts';
import CommandPalette from './CommandPalette.tsx';
import StarMark from './StarMark.tsx';
import ThemeToggle from './ThemeToggle.tsx';

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'method', label: 'How I work' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];
const SECTION_IDS = SECTIONS.map((section) => section.id);

/**
 * The section of the home page in view (tracker F71): the one that crosses a line a little above the middle of the
 * window. Sections follow one another without overlapping, so at most one crosses it; in the first screen none does.
 * Watched only in the browser, so the page drawn on the server marks nothing.
 */
function useSectionInView(watch: boolean): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    if (!watch || !('IntersectionObserver' in window)) return undefined;
    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        setCurrent(SECTION_IDS.find((id) => crossing.has(id)) ?? null);
      },
      { rootMargin: '-40% 0px -59% 0px' },
    );
    for (const id of SECTION_IDS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [watch]);
  return current;
}

/**
 * The bar at the top: the name, the sections, the theme switch. On a phone the sections fold into a menu.
 * home: on the home page the links jump within the page; on any other page they lead back to it.
 */
export default function Header({ home }: { home: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const base = home ? '' : '/';
  // On the other pages the links lead back to the home page, so none of them is the place the reader is in.
  const current = useSectionInView(home);

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
                <a
                  href={`${base}#${section.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={current === section.id ? 'location' : undefined}
                >
                  {current === section.id && <StarMark />}
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
