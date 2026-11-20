import type { ReactNode } from 'react';

/**
 * The title of a section of the home page. It stands on its own, without a bar under it (tracker F34).
 * pageTitle: the section is the whole page (the list of work at /work/), so its title is the h1.
 */
export default function SectionTitle({ id, children, pageTitle = false }: { id: string; children: ReactNode; pageTitle?: boolean }) {
  const Heading = pageTitle ? 'h1' : 'h2';
  return (
    <Heading id={id} className="section__title">
      {children}
    </Heading>
  );
}
