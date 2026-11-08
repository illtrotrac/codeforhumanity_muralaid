// Sample data for the demo mural. In step 4 this moves into a database;
// for now it's a plain TypeScript object so we can focus on the UI.

export type TileStatus = "locked" | "restored";

// What a neighbour has asked for. Every need is a money donation, in dollars.
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
  gridSize: number; // 6 means a 6x6 grid
  isAiSample: boolean;
  finaleTileId: number; // the tile the live demo saves for last
  tiles: MuralTile[];
};

const GRID_SIZE = 8;

// Tiles that already have their colour back, so the demo doesn't start empty.
const RESTORED_IDS = new Set([1, 2, 8, 13, 15, 20, 23, 29, 31, 34]);

// The tile that covers the red coat in the artwork. The live demo pledges here.
const COAT_TILE_ID = 46;

// Sample needs, handed out to tiles in rotation. Names are fictional.
const NEED_TEMPLATES: Need[] = [
  { title: "A hot meal", detail: "One dinner from the community kitchen, served tonight.", amount: 8, postedBy: "Riverside Community Kitchen" },
  { title: "A week of bus fare", detail: "Gets someone to a new job for their first week.", amount: 12, postedBy: "Eastside Shelter" },
  { title: "A month of phone credit", detail: "Keeps a job seeker reachable by employers.", amount: 10, postedBy: "Northgate Food Bank" },
  { title: "School supplies kit", detail: "Notebooks, pens and a backpack for one student.", amount: 10, postedBy: "Eastside Shelter" },
  { title: "Groceries for a family", detail: "A week of staples for a family of four.", amount: 25, postedBy: "Northgate Food Bank" },
  { title: "A warm blanket", detail: "For a new arrival at the overnight shelter.", amount: 9, postedBy: "Eastside Shelter" },
  { title: "A week of laundry", detail: "Clean clothes for job interviews and school.", amount: 7, postedBy: "Riverside Community Kitchen" },
];

const COAT_NEED: Need = {
  title: "A winter coat",
  detail: "Your $15 completes a warm coat for a teenager before the first frost.",
  amount: 15,
  postedBy: "Eastside Shelter",
};

// Build every tile (gridSize x gridSize) from the grid size instead of writing them out by hand.
function buildTiles(size: number): MuralTile[] {
  return Array.from({ length: size * size }, (_, index) => {
    const id = index + 1;
    return {
      id,
      row: Math.floor(index / size),
      col: index % size,
      status: RESTORED_IDS.has(id) ? "restored" : "locked",
      need: id === COAT_TILE_ID ? COAT_NEED : NEED_TEMPLATES[index % NEED_TEMPLATES.length],
    };
  });
}

export const sampleMural: Mural = {
  slug: "the-long-table",
  pageOrder: 1,
  title: "The Long Table",
  location: "Sample neighbourhood wall",
  imageSrc: "/mural/sample.jpg",
  imageAlt:
    "A painted street mural of neighbours sharing a meal at a long table, while a family hands a red winter coat to a young man under a sunrise over colourful houses.",
  gridSize: GRID_SIZE,
  isAiSample: true,
  finaleTileId: COAT_TILE_ID,
  tiles: buildTiles(GRID_SIZE),
};
