// Pictures further down the page appear as they come into view (tracker F20, B14).
// The server and a browser without JavaScript draw everything in place. In the browser, an element that starts
// below the first screen is marked data-reveal="waiting": the stylesheet lays a sheet of drawing paper over each
// picture, never hiding the picture itself, so the browser fetches it at its usual distance ahead (a picture that is
// clipped away is not fetched until it shows). Once a tenth of the element is in view and every picture in it has
// arrived, it becomes data-reveal="shown" and the paper slides away. Text itself is never hidden. With "reduce
// motion" nothing is marked, so nothing waits.
import { useEffect, useRef } from 'react';

/** True when the browser can watch elements and the visitor has not asked for less motion. */
export function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Resolves once a picture can be drawn at once: fetched and decoded. A picture that fails resolves too, so that its
 * frame is not left under the paper for good.
 */
export function arrived(image: HTMLImageElement): Promise<void> {
  const loaded = image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
  return loaded.then(() => image.decode()).catch(() => undefined);
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !motionAllowed()) return undefined;
    // Already on the screen when the page opens: leave it as it is, nothing should vanish and come back.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;
    element.dataset.reveal = 'waiting';
    let gone = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        // The paper comes away only over a picture that is there to be seen (tracker B14): never over an empty
        // frame, and the picture never appears at once halfway through.
        Promise.all(Array.from(element.querySelectorAll('img'), arrived)).then(() => {
          if (!gone) element.dataset.reveal = 'shown';
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => {
      gone = true;
      observer.disconnect();
    };
  }, []);
  return ref;
}
