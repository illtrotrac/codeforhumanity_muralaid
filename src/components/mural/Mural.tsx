"use client";

import { useId, useMemo, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { TAP_MS } from "@/components/magic/MuralMagic";
import { buildRegions, scribblePath, shapeToPath, type Region } from "@/lib/regions";
import type { Mural as MuralData, MuralTile } from "@/lib/types";

type MuralProps = {
  mural: MuralData;
  tiles: MuralTile[];
  justRestoredId: number | null;
  isComplete: boolean;
  isCelebrating: boolean;
  selectedId?: number | null; // pass this (even null) to put regions in admin mode
  onSelectTile: (id: number) => void;
  children?: ReactNode; // overlays drawn on top of the page, like the celebration
};

// A mural as a page in a colouring book. Unfunded regions show the
// black-and-white line art; funded regions show the real painting.
//
// Layers, bottom to top:
//   1. paper + line art      (the uncoloured page)
//   2. the colour painting, visible only through a MASK of funded regions
//   3. faint pencil outlines between regions
//   4. clickable regions (hover glow, selection, celebration shimmer)
export function Mural({
  mural,
  tiles,
  justRestoredId,
  isComplete,
  isCelebrating,
  selectedId,
  onSelectTile,
  children,
}: MuralProps) {
  const { gridCols: cols, gridRows: rows } = mural;
  const isAdmin = selectedId !== undefined;
  // useId gives ids that are unique on the page and identical on server and
  // browser, for the <mask>/<clipPath> references below.
  const uid = useId().replace(/:/g, "");

  // Cutting the regions is pure maths on fixed inputs, so do it once.
  const regions = useMemo(
    () =>
      buildRegions(
        cols,
        rows,
        mural.slug,
        mural.finaleShape ? { tileId: mural.finaleTileId, shape: mural.finaleShape } : undefined,
      ),
    [cols, rows, mural.slug, mural.finaleShape, mural.finaleTileId],
  );

  const tileById = new Map(tiles.map((t) => [t.id, t]));
  const isRestored = (id: number) => tileById.get(id)?.status === "restored";
  const finaleRestored = isRestored(mural.finaleTileId);
  const justRestored = regions.find((r) => r.id === justRestoredId && isRestored(r.id));

  // The finale region goes last, so its traced object sits on top of the
  // neighbouring cells and catches clicks on (say) the coat.
  const ordered = [...regions].sort(
    (a, b) => Number(a.id === mural.finaleTileId) - Number(b.id === mural.finaleTileId),
  );

  function regionLabel(region: Region) {
    const tile = tileById.get(region.id);
    if (!tile) return `Section ${region.id}`;
    const status = tile.status === "restored" ? "coloured in" : "waiting for support";
    return `Section ${region.id}: ${tile.need.title}, $${tile.need.amount}, ${status}`;
  }

  function onKey(event: KeyboardEvent, id: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // stop Space from scrolling the page
      onSelectTile(id);
    }
  }

  return (
    <figure className="flex flex-col gap-4">
      <div className="relative">
        <div
          className="colour-page"
          data-complete={isComplete || undefined}
          data-magic={isCelebrating || undefined}
          style={{ aspectRatio: `${cols} / ${rows}`, "--magic-tap": `${TAP_MS}ms` } as CSSProperties}
        >
          <svg
            viewBox={`0 0 ${cols} ${rows}`}
            role="group"
            aria-label={`${mural.title}, a colouring page with ${regions.length} sections`}
            className="block size-full"
          >
            <defs>
              {/* White = show the colour painting here. Black = hide it. */}
              <mask id={`${uid}-funded`} maskUnits="userSpaceOnUse" x="0" y="0" width={cols} height={rows}>
                {regions
                  .filter((r) => isRestored(r.id) && r.id !== justRestored?.id)
                  .flatMap((r) => r.paths.map((d, i) => <path key={`${r.id}-${i}`} d={d} fill="white" />))}

                {/* The region someone just funded is coloured in with
                    crayon strokes, then filled solid once they finish. */}
                {justRestored && (
                  <g key={`crayon-${justRestored.id}`}>
                    <clipPath id={`${uid}-crayon`}>
                      {justRestored.paths.map((d, i) => <path key={i} d={d} />)}
                    </clipPath>
                    <path
                      d={scribblePath(justRestored.bbox)}
                      className="crayon-stroke"
                      clipPath={`url(#${uid}-crayon)`}
                      pathLength={1}
                    />
                    {justRestored.paths.map((d, i) => (
                      <path key={i} d={d} fill="white" className="crayon-fill" />
                    ))}
                  </g>
                )}

                {/* Until the finale is funded, keep its traced object
                    uncoloured even where it overlaps funded neighbours. */}
                {mural.finaleShape && !finaleRestored && (
                  <path d={shapeToPath(mural.finaleShape)} fill="black" />
                )}
              </mask>
            </defs>

            {/* 1. The uncoloured page */}
            <rect width={cols} height={rows} className="fill-[var(--book-page)]" />
            <image href={mural.lineArtSrc} width={cols} height={rows} preserveAspectRatio="none" className="line-art" />

            {/* 2. The painting, only where the mask is white */}
            <image
              href={mural.imageSrc}
              width={cols}
              height={rows}
              preserveAspectRatio="none"
              mask={`url(#${uid}-funded)`}
            />

            {/* 3. Pencil lines between regions */}
            <g className="region-outlines" aria-hidden="true">
              {ordered.flatMap((r) => r.paths.map((d, i) => <path key={`${r.id}-${i}`} d={d} />))}
            </g>

            {/* 4. The regions you can click */}
            {ordered.map((region) => {
              const tile = tileById.get(region.id);
              const distance = Math.hypot(region.centre[0] - cols / 2, region.centre[1] - rows / 2);
              return (
                <g
                  key={region.id}
                  role="button"
                  tabIndex={0}
                  className="colour-region"
                  data-state={tile?.status}
                  aria-label={regionLabel(region)}
                  aria-haspopup={isAdmin ? undefined : "dialog"}
                  aria-pressed={isAdmin ? region.id === selectedId : undefined}
                  onClick={() => onSelectTile(region.id)}
                  onKeyDown={(e) => onKey(e, region.id)}
                  style={{ "--wave-distance": distance.toFixed(2) } as CSSProperties}
                >
                  {region.paths.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
        {children}
      </div>

      <figcaption className="flex flex-col gap-1 px-2">
        <span className="sr-only">{mural.imageAlt}</span>
        {mural.isAiSample && (
          <span className="font-mono text-label uppercase text-ink-muted">
            AI-generated sample artwork · real pages are drawn by local artists
          </span>
        )}
      </figcaption>
    </figure>
  );
}
