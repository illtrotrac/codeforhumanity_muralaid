import type { CSSProperties } from "react";
import type { MuralTile } from "@/lib/types";

type TileProps = {
  tile: MuralTile;
  gridCols: number;
  gridRows: number;
  imageSrc: string;
  justRestored: boolean;
  // Admin mode: the tile is a toggle that picks it for editing. Left
  // undefined on the public page, where a click opens the need panel.
  selected?: boolean;
  onSelect: (id: number) => void;
};

// One square of the mural. Every tile uses the SAME image, scaled up to
// (columns x 100%) wide and (rows x 100%) tall, then shifted so only this
// tile's slice is visible.
export function Tile({ tile, gridCols, gridRows, imageSrc, justRestored, selected, onSelect }: TileProps) {
  const lastCol = gridCols - 1;
  const lastRow = gridRows - 1;
  const statusText = tile.status === "restored" ? "restored" : "waiting for support";
  // Distance from the centre of the grid, in tiles. The celebration's light
  // wave uses it to reach the outer tiles last.
  const waveDistance = Math.hypot(tile.row - lastRow / 2, tile.col - lastCol / 2);

  return (
    <li className="aspect-square">
      <button
        type="button"
        className="mural-tile block size-full rounded-tile"
        data-state={tile.status}
        data-just-restored={justRestored || undefined}
        aria-haspopup={selected === undefined ? "dialog" : undefined}
        aria-pressed={selected}
        aria-label={`Tile ${tile.id}: ${tile.need.title}, $${tile.need.amount}, ${statusText}`}
        onClick={() => onSelect(tile.id)}
        style={
          {
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: `${gridCols * 100}% ${gridRows * 100}%`,
            backgroundPosition: `${(tile.col / lastCol) * 100}% ${(tile.row / lastRow) * 100}%`,
            "--wave-distance": waveDistance.toFixed(2),
          } as CSSProperties
        }
      />
    </li>
  );
}
