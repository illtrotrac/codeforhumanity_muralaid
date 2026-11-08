import type { CSSProperties } from "react";

export type FlipDirection = "next" | "prev";

type OpenBookProps = {
  // Changes every time the reader turns a page. Used as the turning leaf's
  // React key, so a new key = a new element = the flip animation replays.
  flipId: number;
  direction: FlipDirection;
};

// Golden dust motes drifting up from the spine. Positions come from the
// index, not Math.random(), so the server and browser render the same thing.
const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: 30 + ((i * 37) % 40), // 30–70% across, clustered around the spine
  delay: (i * 0.53) % 6,
  duration: 5 + ((i * 1.7) % 4),
  size: 2 + (i % 3),
}));

// An open storybook lying on a table, built from flat CSS shapes in 3D:
// the whole book is tilted back with rotateX, and pages turn with rotateY
// around the spine. Purely decorative, so screen readers skip it.
export function OpenBook({ flipId, direction }: OpenBookProps) {
  return (
    <div className="book" aria-hidden="true">
      <div className="book-glow" />
      <div className="book-dust">
        {DUST.map((d, i) => (
          <span
            key={i}
            style={
              {
                left: `${d.left}%`,
                "--dust-delay": `${d.delay}s`,
                "--dust-duration": `${d.duration}s`,
                "--dust-size": `${d.size}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="book-body">
        <div className="book-cover" />
        <div className="book-page book-page-left" />
        <div className="book-page book-page-right" />
        {flipId > 0 && <div key={flipId} className="book-leaf" data-direction={direction} />}
      </div>
      <div className="book-ribbon" />
    </div>
  );
}
