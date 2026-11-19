// Blocks of text rise into place as they come into view while scrolling (tracker F23).
// A component marks a block with data-animate. When the page has opened, every marked block that starts below the
// first screen is set to data-reveal="waiting"; the stylesheet then clips and lowers its children, so the block
// itself keeps its size and the browser can tell when it comes into view. When it does, it becomes "shown", and
// blocks that come into view together follow one another (--reveal-delay). Figures marked data-count count up from
// zero to their real value. The server, a browser without JavaScript and "reduce motion" show everything in place.
import { useEffect } from 'react';
import { motionAllowed } from './reveal.ts';

const STAGGER_MS = 90;
const MAX_STAGGER = 6;
const COUNT_MS = 1100;

/** Counts a figure up from zero to the number it shows, then leaves the original text in place. */
function countUp(element: HTMLElement): void {
  const text = element.textContent ?? '';
  const target = Number(text.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(target) || target <= 0) return;
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / COUNT_MS);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = progress < 1 ? String(Math.round(target * eased)) : text;
    if (progress < 1) requestAnimationFrame(step);
    else element.dataset.counted = 'true';
  };
  element.textContent = '0';
  requestAnimationFrame(step);
}

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
          element.querySelectorAll<HTMLElement>('[data-count]').forEach((figure) => countUp(figure));
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
