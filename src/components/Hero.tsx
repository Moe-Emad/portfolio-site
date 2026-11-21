import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { content } from '../content/index.ts';
import { leadProject, projectMeta } from '../content/schema.ts';
import { roleLine } from '../lib/profile.js';
import { projectPath } from '../routes.ts';
import Shot from './Shot.tsx';
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

/**
 * The first screen: the name as a two-script sign with the role under it, as the caption under a drawing, one
 * sentence about the work, and the way on: one button to the work, and a plain link to the contact form (F45).
 * Under the star, the screen of the lead project hangs from the band (F60): the work is seen without scrolling.
 */
export default function Hero() {
  const { profile } = content;
  const lead = leadProject(content.projects);
  const cover = lead?.images[0];
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
          <h1 id="hero-name" className="sign">
            <span className="sign__first">{first}</span>{' '}
            {rest.length > 0 && <span className="sign__rest">{rest.join(' ')}</span>}{' '}
            <span className="sign__arabic" lang="ar" dir="rtl">
              {profile.nameArabic}
            </span>
          </h1>
          {/* The caption, the headline and the way on: on a tablet they stand beside the star as one block. */}
          <div className="hero__lead">
            <p className="hero__role">{roleLine(profile.role, profile.location)}</p>
            <p className="hero__headline">{profile.headline}</p>
            <div className="hero__actions">
              <a href="#work" className="button button--sign">
                See the work
              </a>
              <a href="#contact" className="hero__link">
                Get in touch
              </a>
            </div>
          </div>
        </div>
        <div ref={drawing} className="hero__drawing">
          <StarDrawing />
        </div>
        {lead && cover && (
          <a href={projectPath(lead.slug)} className="hero__work">
            {/* sizes: the width of --work in index.css. */}
            <Shot image={cover} sizes="(min-width: 64rem) min(36vw, 40rem), (min-width: 40rem) 36rem, calc(100vw - 2.5rem)" first />
            <span className="hero__work-label">
              <span className="hero__work-title">{lead.title}</span>
              <span className="hero__work-meta">{projectMeta(lead)}</span>
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
