import type { ReactNode } from 'react';

/**
 * A dimension line, as on a technical drawing (tracker F67): an extension tick at each end, a line with an arrowhead
 * running out to each tick, and what it measures in the middle. It stands under the head of a section and says the
 * size of what follows - figures counted from the content, so they stay true. Further down the page its two lines
 * draw out from the label as it comes into view (data-animate, src/lib/scroll-motion.ts); the label never moves.
 */
export default function Dimension({ children }: { children: ReactNode }) {
  return (
    <p className="dim" data-animate="dimension">
      <span className="dim__tick" aria-hidden="true" />
      <span className="dim__line dim__line--start" aria-hidden="true" />
      <span className="dim__label">{children}</span>
      <span className="dim__line dim__line--end" aria-hidden="true" />
      <span className="dim__tick" aria-hidden="true" />
    </p>
  );
}
