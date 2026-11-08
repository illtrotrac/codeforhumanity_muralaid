import type { MuralTile } from "@/data/sample-mural";

type TileProps = {
  tile: MuralTile;
  gridSize: number;
  imageSrc: string;
  justRestored: boolean;
  onSelect: (id: number) => void;
};

// One square of the mural. Every tile uses the SAME image, scaled up to
// gridSize x 100%, then shifted so only this tile's slice is visible.
export function Tile({ tile, gridSize, imageSrc, justRestored, onSelect }: TileProps) {
  const last = gridSize - 1;
  const statusText = tile.status === "restored" ? "restored" : "waiting for support";

  return (
    <li className="aspect-square">
      <button
        type="button"
        className="mural-tile block size-full rounded-tile"
        data-state={tile.status}
        data-just-restored={justRestored || undefined}
        aria-haspopup="dialog"
        aria-label={`Tile ${tile.id}: ${tile.need.title}, $${tile.need.amount}, ${statusText}`}
        onClick={() => onSelect(tile.id)}
        style={{
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
          backgroundPosition: `${(tile.col / last) * 100}% ${(tile.row / last) * 100}%`,
        }}
      />
    </li>
  );
}
