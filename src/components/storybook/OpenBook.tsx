"use client";

import { memo, useEffect, useRef, type CSSProperties } from "react";
import type { PageFlip } from "page-flip";
import { lineArtFor } from "@/lib/line-art";
import type { MuralSummary } from "@/lib/types";

type OpenBookProps = {
  murals: MuralSummary[];
  spread: number; // which mural's spread is open (0-based)
  onTurn: (spread: number) => void; // the reader dragged a page themselves
};

// Golden dust motes drifting up from the spine. Positions come from the
// index, not Math.random(), so the server and browser render the same thing.
const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: 30 + ((i * 37) % 40), // 30–70% across, clustered around the spine
  delay: (i * 0.53) % 6,
  duration: 5 + ((i * 1.7) % 4),
  size: 2 + (i % 3),
}));

// Each mural is one spread: page 2n is its chapter heading, page 2n+1 its
// colouring page. So spread n starts on page n * 2.
const pageOf = (spread: number) => spread * 2;

// A real, flippable storybook drawn by the page-flip library: pages curl
// as they turn, with moving shadows, and readers can drag a corner.
//
// The library moves page elements around itself, which would confuse
// React. So React renders the pages once into a hidden "template" div; we
// hand the library COPIES, mounted in a div React never touches.
export const OpenBook = memo(function OpenBook({ murals, spread, onTurn }: OpenBookProps) {
  const templatesRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);

  // Latest values for code that runs later (inside the library's events).
  const onTurnRef = useRef(onTurn);
  const spreadRef = useRef(spread);
  useEffect(() => {
    onTurnRef.current = onTurn;
    spreadRef.current = spread;
  });

  // Build the book once (and again if Next re-shows this page after you
  // come back; effects re-run then, see the Activity note in Storybook).
  useEffect(() => {
    const host = hostRef.current;
    const templates = templatesRef.current;
    if (!host || !templates) return;

    let cancelled = false;
    let book: PageFlip | null = null;
    const mount = document.createElement("div");
    host.appendChild(mount);

    // Load the library only in the browser, only when the book appears.
    void import("page-flip").then(({ PageFlip }) => {
      if (cancelled) return;
      book = new PageFlip(mount, {
        width: 320, // one page; the open book is two pages wide
        height: 200, // a wide picture-book page, so the book stays short
        size: "stretch", // fill the container, within these limits
        minWidth: 120,
        maxWidth: 400,
        minHeight: 75,
        maxHeight: 250,
        usePortrait: false, // always show a two-page spread
        startPage: pageOf(spreadRef.current),
        flippingTime: 900,
        maxShadowOpacity: 0.45,
        showCover: false,
        mobileScrollSupport: false,
      });
      const pages = Array.from(templates.children, (el) => el.cloneNode(true) as HTMLElement);
      book.loadFromHTML(pages);
      book.on("flip", (event) => onTurnRef.current(Math.floor(event.data / 2)));
      bookRef.current = book;
    });

    return () => {
      cancelled = true;
      book?.destroy();
      mount.remove();
      bookRef.current = null;
    };
  }, []);

  // When the arrows (or a swipe) change the spread, turn the page for real.
  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    const current = Math.floor(book.getCurrentPageIndex() / 2);
    if (current !== spread) book.flip(pageOf(spread));
  }, [spread]);

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

      <div ref={hostRef} className="book-host" />

      {/* Page templates: rendered by React, copied into the book, never shown. */}
      <div ref={templatesRef} hidden>
        {murals.flatMap((m) => {
          const percent = m.totalTiles ? Math.round((m.restoredTiles / m.totalTiles) * 100) : 0;
          return [
            <div key={`${m.slug}-chapter`} className="book-sheet book-sheet-left">
              <div className="book-sheet-inner">
                <p className="book-sheet-kicker">Chapter {m.pageOrder}</p>
                <p className="book-sheet-title">{m.title}</p>
                <p className="book-sheet-ornament">❦</p>
                <p className="book-sheet-body">With {m.organisation.name}</p>
                <p className="book-sheet-kicker">{percent}% coloured in</p>
              </div>
            </div>,
            <div key={`${m.slug}-page`} className="book-sheet book-sheet-right">
              {/* eslint-disable-next-line @next/next/no-img-element -- copied into the book as raw HTML */}
              <img src={lineArtFor(m.imageSrc)} alt="" className="book-sheet-art" />
            </div>,
          ];
        })}
      </div>
    </div>
  );
});
