// Sample data for the demo mural. In step 4 this moves into a database;
// for now it's a plain TypeScript object so we can focus on the UI.

export type TileStatus = "locked" | "restored";

export type MuralTile = {
  id: number; // 1-based, counted left-to-right, top-to-bottom
  row: number; // 0-based
  col: number; // 0-based
  status: TileStatus;
};

export type Mural = {
  title: string;
  location: string;
  imageSrc: string;
  imageAlt: string;
  gridSize: number; // 6 means a 6x6 grid
  isAiSample: boolean;
  tiles: MuralTile[];
};

const GRID_SIZE = 8;

// Tiles that already have their colour back, so the demo doesn't start empty.
const RESTORED_IDS = new Set([1, 2, 8, 13, 15, 20, 23, 29, 31, 34]);

// Build every tile (gridSize x gridSize) from the grid size instead of writing them out by hand.
function buildTiles(size: number): MuralTile[] {
  return Array.from({ length: size * size }, (_, index) => ({
    id: index + 1,
    row: Math.floor(index / size),
    col: index % size,
    status: RESTORED_IDS.has(index + 1) ? "restored" : "locked",
  }));
}

export const sampleMural: Mural = {
  title: "The Long Table",
  location: "Sample neighbourhood wall",
  imageSrc: "/mural/sample.jpg",
  imageAlt:
    "A painted street mural of neighbours sharing a meal at a long table, while a family hands a red winter coat to a young man under a sunrise over colourful houses.",
  gridSize: GRID_SIZE,
  isAiSample: true,
  tiles: buildTiles(GRID_SIZE),
};
