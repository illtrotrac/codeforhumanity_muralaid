import type { CSSProperties, ReactNode } from "react";
import type { Mural as MuralData, MuralTile } from "@/data/sample-mural";
import { TAP_MS } from "@/components/magic/MuralMagic";
import { Tile } from "./Tile";

type MuralProps = {
  mural: MuralData;
  tiles: MuralTile[];
  justRestoredId: number | null;
  isComplete: boolean;
  isCelebrating: boolean;
  onSelectTile: (id: number) => void;
  children?: ReactNode; // overlays drawn on top of the grid, like the celebration
};

// The full mural: a square grid of tiles, with a caption underneath.
// It doesn't own any state; the parent passes tiles in and hears about clicks.
export function Mural({
  mural,
  tiles,
  justRestoredId,
  isComplete,
  isCelebrating,
  onSelectTile,
  children,
}: MuralProps) {
  return (
    <figure className="flex flex-col gap-4">
      <div className="relative">
        <ul
          role="list"
          aria-label={`${mural.title}, ${tiles.length} tiles`}
          className="mural-grid grid gap-(--tile-gap) rounded-panel bg-surface p-2 shadow-soft"
          data-complete={isComplete || undefined}
          data-magic={isCelebrating || undefined}
          style={
            {
              gridTemplateColumns: `repeat(${mural.gridSize}, minmax(0, 1fr))`,
              "--magic-tap": `${TAP_MS}ms`,
            } as CSSProperties
          }
        >
          {tiles.map((tile) => (
            <Tile
              key={tile.id}
              tile={tile}
              gridSize={mural.gridSize}
              imageSrc={mural.imageSrc}
              justRestored={tile.id === justRestoredId}
              onSelect={onSelectTile}
            />
          ))}
        </ul>
        {children}
      </div>

      <figcaption className="flex flex-col gap-1 px-2">
        <span className="sr-only">{mural.imageAlt}</span>
        {mural.isAiSample && (
          <span className="font-mono text-label uppercase text-ink-muted">
            AI-generated sample artwork · real murals are commissioned from local artists
          </span>
        )}
      </figcaption>
    </figure>
  );
}
