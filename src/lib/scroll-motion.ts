// While scrolling, lines draw themselves (tracker F48, after F23). A component marks a block that carries a rule
// with data-animate. When the page has opened, every marked block that starts below the first screen is set to
// data-reveal="waiting"; the stylesheet then leaves its rule undrawn, and its text exactly where it is. When the block
// comes into view it becomes "shown" and its rule draws across; blocks that come into view together follow one
// another (--reveal-delay). The server, a browser without JavaScript and "reduce motion" show every rule whole.
import { useEffect } from 'react';
import { motionAllowed } from './reveal.ts';

const STAGGER_MS = 90;
const MAX_STAGGER = 6;

export function useScrollMotion(): void {
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main || !motionAllowed()) return undefined;
    const seen = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement)
          .sort((a, b) => {
            const first = a.getBoundingClientRect();
            const second = b.getBoundingClientRect();
            return first.top - second.top || first.left - second.left;
          });
        entering.forEach((element, index) => {
          element.style.setProperty('--reveal-delay', `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms`);
          element.dataset.reveal = 'shown';
          observer.unobserve(element);
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    const watch = () => {
      main.querySelectorAll<HTMLElement>('[data-animate]').forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        // Already on the screen: leave it as it is, nothing should vanish and come back.
        if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        element.dataset.reveal = 'waiting';
        observer.observe(element);
      });
    };

    watch();
    // Blocks drawn later (another tab of the list of work) are watched too.
    const changes = new MutationObserver(watch);
    changes.observe(main, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      changes.disconnect();
    };
  }, []);
}
