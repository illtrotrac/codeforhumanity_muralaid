import type { Mural as MuralData } from "@/data/sample-mural";
import { Tile } from "./Tile";

type MuralProps = {
  mural: MuralData;
};

// The full mural: a square grid of tiles, with a caption underneath.
export function Mural({ mural }: MuralProps) {
  return (
    <figure className="flex flex-col gap-4">
      <ul
        role="list"
        aria-label={`${mural.title}, ${mural.gridSize * mural.gridSize} tiles`}
        className="grid gap-(--tile-gap) rounded-panel bg-surface p-2 shadow-soft"
        style={{ gridTemplateColumns: `repeat(${mural.gridSize}, minmax(0, 1fr))` }}
      >
        {mural.tiles.map((tile) => (
          <Tile
            key={tile.id}
            tile={tile}
            gridSize={mural.gridSize}
            imageSrc={mural.imageSrc}
          />
        ))}
      </ul>

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
