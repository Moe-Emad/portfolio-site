// Pictures further down the page appear as they come into view (tracker F20).
// The server and a browser without JavaScript draw everything in place. In the browser, an element that starts
// below the first screen is marked data-reveal="waiting" (the stylesheet hides a picture by clipping it) and then
// data-reveal="shown" once a tenth of it is in view. Text itself is never hidden. With "reduce motion" nothing is
// marked, so nothing waits.
import { useEffect, useRef } from 'react';

/** True when the browser can watch elements and the visitor has not asked for less motion. */
export function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !motionAllowed()) return undefined;
    // Already on the screen when the page opens: leave it as it is, nothing should vanish and come back.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;
    element.dataset.reveal = 'waiting';
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}
