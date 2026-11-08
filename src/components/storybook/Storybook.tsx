"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { MuralSummary } from "@/lib/types";
import { OpenBook, type FlipDirection } from "./OpenBook";

// Where a card sits, by distance from the current page: 0 is the centre,
// 1 is right beside it, 2 is at the edge. Further than 2 is hidden.
const POSITIONS = [
  { x: 0, z: 0, rotate: 0, scale: 1, opacity: 1 },
  { x: 0.84, z: -180, rotate: 34, scale: 0.74, opacity: 0.78 },
  { x: 1.48, z: -340, rotate: 46, scale: 0.56, opacity: 0.32 },
];

const SWIPE_PX = 50; // how far a finger must travel to count as a swipe
const DIVE_MS = 650; // matches --story-dive in globals.css

function cardStyle(offset: number): CSSProperties {
  const distance = Math.min(Math.abs(offset), POSITIONS.length);
  const side = Math.sign(offset); // -1 left, 0 centre, 1 right
  const p = POSITIONS[distance] ?? { ...POSITIONS[POSITIONS.length - 1], opacity: 0 };
  return {
    "--card-x": p.x * side,
    "--card-z": `${p.z}px`,
    // Cards on the right turn their left edge toward you, and vice versa.
    "--card-rotate": `${p.rotate * side}deg`,
    "--card-scale": p.scale,
    "--card-opacity": distance >= POSITIONS.length ? 0 : p.opacity,
    zIndex: 10 - distance,
  } as CSSProperties;
}

type StorybookProps = {
  murals: MuralSummary[]; // in page order
};

// The front page: an open book with murals rising out of it, one per page.
export function Storybook({ murals }: StorybookProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState<{ id: number; direction: FlipDirection }>({ id: 0, direction: "next" });
  const [divingInto, setDivingInto] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);

  const current = murals[index];
  const isFirst = index === 0;
  const isLast = index === murals.length - 1;

  // Load the current mural's page in the background, so diving in is instant.
  useEffect(() => {
    if (current) router.prefetch(`/murals/${current.slug}`);
  }, [current, router]);

  function goTo(next: number) {
    if (next === index || next < 0 || next >= murals.length || divingInto) return;
    setFlip((f) => ({ id: f.id + 1, direction: next > index ? "next" : "prev" }));
    setIndex(next);
  }

  // Zoom the card out of the book, THEN change page. Ctrl/Cmd-click and
  // middle-click still open a new tab as normal, because it's a real link.
  function dive(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setDivingInto(slug);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => router.push(`/murals/${slug}`), reduced ? 0 : DIVE_MS);
  }

  if (!current) return <p className="text-ink-muted">The book is empty for now.</p>;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="The book of murals"
      className="story"
      data-diving={divingInto ? true : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goTo(index - 1);
        if (e.key === "ArrowRight") goTo(index + 1);
      }}
      onPointerDown={(e) => {
        swipeStart.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return;
        const dx = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (dx > SWIPE_PX) goTo(index - 1);
        if (dx < -SWIPE_PX) goTo(index + 1);
      }}
    >
      <ol className="story-stage">
        {murals.map((m, i) => {
          const offset = i - index;
          const isCurrent = offset === 0;
          const progress = m.totalTiles ? m.restoredTiles / m.totalTiles : 0;
          const face = (
            <>
              <Image
                src={m.imageSrc}
                alt=""
                fill
                sizes="(min-width: 1024px) 460px, 70vw"
                priority={Math.abs(offset) <= 1}
                className="object-cover"
                // The more of the mural is funded, the more colour the cover shows.
                style={{ filter: `grayscale(${(1 - progress).toFixed(2)})` }}
              />
              <div className="story-card-caption">
                <p className="font-mono text-label uppercase text-ink-muted">
                  Page {m.pageOrder} · {m.organisation.sector}
                </p>
                <h2 className="font-display text-2xl leading-tight tracking-tight text-ink-strong">
                  {m.title}
                </h2>
                <p className="text-sm text-ink">{m.organisation.name}</p>
                <div className="mt-1 h-1 overflow-hidden rounded-pill bg-surface-raised">
                  <div className="h-full rounded-pill bg-accent" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </>
          );

          return (
            <li
              key={m.slug}
              className="story-card"
              style={cardStyle(offset)}
              aria-roledescription="slide"
              aria-label={`Page ${i + 1} of ${murals.length}: ${m.title}`}
              aria-hidden={!isCurrent}
              data-current={isCurrent || undefined}
            >
              <div className="story-card-float">
                {isCurrent ? (
                  <Link
                    href={`/murals/${m.slug}`}
                    onClick={(e) => dive(e, m.slug)}
                    className="story-card-face"
                  >
                    {face}
                    <span className="sr-only">
                      Open {m.title}, {m.restoredTiles} of {m.totalTiles} tiles restored
                    </span>
                  </Link>
                ) : (
                  // Side cards turn to their page when clicked. They're skipped
                  // by Tab and screen readers; the arrow buttons cover that.
                  <button type="button" tabIndex={-1} onClick={() => goTo(i)} className="story-card-face">
                    {face}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={isFirst}
        className="story-arrow story-arrow-prev"
        aria-label="Previous page"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        disabled={isLast}
        className="story-arrow story-arrow-next"
        aria-label="Next page"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>

      <OpenBook flipId={flip.id} direction={flip.direction} />

      <p className="mt-6 text-center font-mono text-label uppercase text-ink-muted tabular-nums">
        Page {index + 1} of {murals.length}
      </p>
      {/* Announces each page turn to screen readers. */}
      <p aria-live="polite" className="sr-only">
        Page {index + 1} of {murals.length}: {current.title}, with {current.organisation.name}.
      </p>
    </section>
  );
}
