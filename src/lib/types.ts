// Shared shapes, used by the server (database, API) and the browser (UI).

export type TileStatus = "locked" | "restored";

// What a neighbour has asked for. Every need is a money donation, in whole
// dollars. Who asked is the mural's organisation.
export type Need = {
  title: string;
  detail: string;
  amount: number;
};

export type MuralTile = {
  id: number; // 1-based, counted left-to-right, top-to-bottom
  row: number; // 0-based
  col: number; // 0-based
  status: TileStatus;
  need: Need;
};

// The partner behind a mural. Each mural belongs to exactly one.
export type Organisation = {
  slug: string;
  name: string;
  sector: string; // e.g. "Animal welfare"
  tagline: string;
  isVerified: boolean;
};

export type Mural = {
  slug: string; // the mural's name in URLs, e.g. /murals/the-long-table
  pageOrder: number; // its page in the storybook
  title: string;
  location: string;
  imageSrc: string;
  imageAlt: string;
  gridCols: number; // tiles across
  gridRows: number; // tiles down
  isAiSample: boolean;
  finaleTileId: number; // the tile the live demo saves for last
  organisation: Organisation;
  tiles: MuralTile[];
};

// A storybook page needs the cover details and progress, not every tile.
export type MuralSummary = {
  slug: string;
  pageOrder: number;
  title: string;
  location: string;
  imageSrc: string;
  organisation: Organisation;
  totalTiles: number;
  restoredTiles: number;
};

export type DemoAction = "reset" | "skip-to-finale";
