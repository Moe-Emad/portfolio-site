import type { ReactNode } from 'react';
import { useReveal } from '../lib/reveal.ts';

/**
 * The title of a section of the home page; its rule draws itself when it comes into view (tracker F20).
 * pageTitle: the section is the whole page (the list of work at /work/), so its title is the h1.
 */
export default function SectionTitle({ id, children, pageTitle = false }: { id: string; children: ReactNode; pageTitle?: boolean }) {
  const ref = useReveal<HTMLHeadingElement>();
  const Heading = pageTitle ? 'h1' : 'h2';
  return (
    <Heading ref={ref} id={id} className="section__title">
      {children}
    </Heading>
  );
}
