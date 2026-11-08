// Shared shapes, used by the server (database, API) and the browser (UI).

export type TileStatus = "locked" | "restored";

// What a neighbour has asked for. Every need is a money donation, in whole
// dollars. Who asked is the mural's organisation.
export type Need = {
  title: string;
  detail: string;
  amount: number;
};

// What a donor chose to leave on the region they funded. Both optional.
export type DonorNote = {
  donorName: string | null; // null = anonymous
  message: string | null;
};

export type MuralTile = {
  id: number; // 1-based, counted left-to-right, top-to-bottom
  row: number; // 0-based
  col: number; // 0-based
  status: TileStatus;
  need: Need;
  note: DonorNote | null; // set once the tile is funded (null before, or for seeded demo tiles)
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
  lineArtSrc: string; // the black-and-white colouring-page version
  isAiSample: boolean;
  finaleTileId: number; // the tile the live demo saves for last
  // Hand-traced outline of the finale object (the coat, the sun...), as
  // [x, y] points in tile units. null = the finale is an ordinary region.
  finaleShape: Array<[number, number]> | null;
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

// One line in the "recent kindness" ticker.
export type PledgeActivity = {
  tileId: number;
  title: string;
  amount: number;
  at: string; // ISO timestamp, UTC
  donorName: string | null; // null = anonymous
};

// Live events the server pushes to every browser watching a mural.
export type MuralEvent =
  | { type: "tile-restored"; slug: string; tile: MuralTile; completed: boolean; pledge: PledgeActivity }
  | { type: "tile-updated"; slug: string; tile: MuralTile } // an admin edited a need
  | { type: "mural-replaced"; slug: string; tiles: MuralTile[] }; // demo reset or skip
