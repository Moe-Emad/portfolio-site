import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { content } from '../content/index.ts';
import StarDrawing from './StarDrawing.tsx';

/** The drawing leans a little towards the mouse (tracker F20): only with a mouse, and not with "reduce motion". */
function useLean(area: RefObject<HTMLElement | null>, target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = area.current;
    const drawing = target.current;
    if (!hero || !drawing) return undefined;
    if (!window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return undefined;
    const lean = (x: number, y: number) => {
      drawing.style.setProperty('--lean-x', x.toFixed(3));
      drawing.style.setProperty('--lean-y', y.toFixed(3));
    };
    const move = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      lean((event.clientX - box.left) / box.width - 0.5, (event.clientY - box.top) / box.height - 0.5);
    };
    const leave = () => lean(0, 0);
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => {
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
    };
  }, [area, target]);
}

/** The first screen: the name as a two-script sign, one sentence about the work, and the way on. */
export default function Hero() {
  const { profile } = content;
  // The sign has two rows: the first name on top; below it the rest of the name on the left and the Arabic
  // name on the right, each script starting from its own side.
  const [first, ...rest] = profile.name.split(' ');
  const hero = useRef<HTMLElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  useLean(hero, drawing);

  return (
    <section ref={hero} id="top" className="hero" aria-labelledby="hero-name">
      <div className="wrap hero__grid">
        <div className="hero__text">
          <p className="hero__role">
            {profile.role} in {profile.location}
          </p>
          <h1 id="hero-name" className="sign">
            <span className="sign__first">{first}</span>{' '}
            {rest.length > 0 && <span className="sign__rest">{rest.join(' ')}</span>}{' '}
            <span className="sign__arabic" lang="ar" dir="rtl">
              {profile.nameArabic}
            </span>
          </h1>
          <p className="hero__headline">{profile.headline}</p>
          <div className="hero__actions">
            <a href="#work" className="button button--sign">
              See the work
            </a>
            <a href="#contact" className="button button--outline">
              Get in touch
            </a>
          </div>
        </div>
        <div ref={drawing} className="hero__drawing">
          <StarDrawing />
        </div>
      </div>
    </section>
  );
}
