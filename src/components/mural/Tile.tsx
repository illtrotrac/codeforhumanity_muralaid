import type { MuralTile } from "@/data/sample-mural";

type TileProps = {
  tile: MuralTile;
  gridSize: number;
  imageSrc: string;
};

// One square of the mural. Every tile uses the SAME image, scaled up to
// gridSize x 100%, then shifted so only this tile's slice is visible.
export function Tile({ tile, gridSize, imageSrc }: TileProps) {
  const last = gridSize - 1;

  return (
    <li
      className="mural-tile aspect-square rounded-tile"
      data-state={tile.status}
      style={{
        backgroundImage: `url(${imageSrc})`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        backgroundPosition: `${(tile.col / last) * 100}% ${(tile.row / last) * 100}%`,
      }}
    >
      <span className="sr-only">
        Tile {tile.id}: {tile.status === "restored" ? "restored" : "waiting for support"}
      </span>
    </li>
  );
}
