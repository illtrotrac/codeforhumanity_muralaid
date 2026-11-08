// Shared shapes, used by the server (database, API) and the browser (UI).

export type TileStatus = "locked" | "restored";

// What a neighbour has asked for. Every need is a money donation, in whole dollars.
export type Need = {
  title: string;
  detail: string;
  amount: number;
  postedBy: string;
};

export type MuralTile = {
  id: number; // 1-based, counted left-to-right, top-to-bottom
  row: number; // 0-based
  col: number; // 0-based
  status: TileStatus;
  need: Need;
};

export type Mural = {
  slug: string; // the mural's name in URLs, e.g. /murals/the-long-table
  pageOrder: number; // its page in the storybook
  title: string;
  location: string;
  imageSrc: string;
  imageAlt: string;
  gridSize: number; // 8 means an 8x8 grid
  isAiSample: boolean;
  finaleTileId: number; // the tile the live demo saves for last
  tiles: MuralTile[];
};

// A storybook page needs the cover details and progress, not every tile.
export type MuralSummary = {
  slug: string;
  pageOrder: number;
  title: string;
  location: string;
  imageSrc: string;
  totalTiles: number;
  restoredTiles: number;
};

export type DemoAction = "reset" | "skip-to-finale";
