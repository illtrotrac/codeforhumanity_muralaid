import type { Mural, MuralTile, Need } from "@/lib/types";

// The sample murals a fresh database starts with, one per storybook page.
// All artwork is AI-generated; real murals come from local artists.
// Organisation names are fictional.

type SeedMural = Omit<Mural, "tiles"> & {
  needs: Need[]; // handed out to tiles in rotation
  finaleNeed: Need; // the need on finaleTileId
  restoredIds: number[]; // tiles that start in colour, so the demo isn't empty
};

function buildTiles(seed: SeedMural): MuralTile[] {
  const size = seed.gridSize;
  const restored = new Set(seed.restoredIds);
  return Array.from({ length: size * size }, (_, index) => {
    const id = index + 1;
    return {
      id,
      row: Math.floor(index / size),
      col: index % size,
      status: restored.has(id) ? "restored" : "locked",
      need: id === seed.finaleTileId ? seed.finaleNeed : seed.needs[index % seed.needs.length],
    };
  });
}

const SEEDS: SeedMural[] = [
  {
    slug: "the-long-table",
    pageOrder: 1,
    title: "The Long Table",
    location: "Sample wall · Riverside",
    imageSrc: "/mural/sample.jpg",
    imageAlt:
      "A painted street mural of neighbours sharing a meal at a long table, while a family hands a red winter coat to a young man under a sunrise over colourful houses.",
    gridSize: 8,
    isAiSample: true,
    finaleTileId: 46, // the red coat
    restoredIds: [1, 2, 8, 13, 15, 20, 23, 29, 31, 34],
    finaleNeed: {
      title: "A winter coat",
      detail: "Your $15 completes a warm coat for a teenager before the first frost.",
      amount: 15,
      postedBy: "Eastside Shelter",
    },
    needs: [
      { title: "A hot meal", detail: "One dinner from the community kitchen, served tonight.", amount: 8, postedBy: "Riverside Community Kitchen" },
      { title: "A week of bus fare", detail: "Gets someone to a new job for their first week.", amount: 12, postedBy: "Eastside Shelter" },
      { title: "A month of phone credit", detail: "Keeps a job seeker reachable by employers.", amount: 10, postedBy: "Northgate Food Bank" },
      { title: "School supplies kit", detail: "Notebooks, pens and a backpack for one student.", amount: 10, postedBy: "Eastside Shelter" },
      { title: "Groceries for a family", detail: "A week of staples for a family of four.", amount: 25, postedBy: "Northgate Food Bank" },
      { title: "A warm blanket", detail: "For a new arrival at the overnight shelter.", amount: 9, postedBy: "Eastside Shelter" },
      { title: "A week of laundry", detail: "Clean clothes for job interviews and school.", amount: 7, postedBy: "Riverside Community Kitchen" },
    ],
  },
  {
    slug: "the-learning-circle",
    pageOrder: 2,
    title: "The Learning Circle",
    location: "Sample wall · Southside Library",
    imageSrc: "/mural/learning-circle.jpg",
    imageAlt:
      "A painted mural titled The Learning Circle: an older man and a girl read a glowing open book, surrounded by children, a makerspace with robots, a community library shelf and a painter at an easel.",
    gridSize: 8,
    isAiSample: true,
    finaleTileId: 37, // the glowing book
    restoredIds: [3, 6, 11, 19, 26, 40, 44, 52, 58, 63],
    finaleNeed: {
      title: "Storybooks for the circle",
      detail: "Your $20 completes a box of new picture books for the Saturday reading circle.",
      amount: 20,
      postedBy: "Southside Learning Centre",
    },
    needs: [
      { title: "Books for the reading corner", detail: "Three new chapter books chosen by the kids.", amount: 12, postedBy: "Friends of Southside Library" },
      { title: "An hour of tutoring", detail: "One-to-one maths help before exams.", amount: 15, postedBy: "Southside Learning Centre" },
      { title: "Robotics club parts", detail: "Motors and sensors for the makerspace team.", amount: 20, postedBy: "Southside Learning Centre" },
      { title: "A seat on the museum trip", detail: "Covers the bus and entry for one student.", amount: 18, postedBy: "Friends of Southside Library" },
      { title: "Art supplies for a term", detail: "Paints, brushes and paper for one young artist.", amount: 10, postedBy: "Southside Learning Centre" },
      { title: "Laptop repair", detail: "Fixes a student's laptop so they can do homework.", amount: 25, postedBy: "Friends of Southside Library" },
      { title: "A library bus pass", detail: "A month of rides to the library after school.", amount: 8, postedBy: "Southside Learning Centre" },
    ],
  },
  {
    slug: "the-urban-harvest",
    pageOrder: 3,
    title: "The Urban Harvest",
    location: "Sample wall · Fifth Street garden lot",
    imageSrc: "/mural/urban-harvest.jpg",
    imageAlt:
      "A bright mural titled The Urban Harvest Community Hub: neighbours plant carrots and tomatoes in a community garden under a big sun, beside a fresh produce stall and tall sunflowers.",
    gridSize: 6,
    isAiSample: true,
    finaleTileId: 10, // the sun
    restoredIds: [2, 7, 14, 21, 30, 33],
    finaleNeed: {
      title: "Grow lights for winter",
      detail: "Your $25 keeps the greenhouse growing through winter, so the harvest never stops.",
      amount: 25,
      postedBy: "Fifth Street Growers",
    },
    needs: [
      { title: "Seed packets for a bed", detail: "Enough seeds to plant one raised garden bed.", amount: 6, postedBy: "Fifth Street Growers" },
      { title: "A fresh produce box", detail: "A week of vegetables for a family, picked here.", amount: 14, postedBy: "Harvest Hub Pantry" },
      { title: "Gloves and a trowel", detail: "Tools for a new volunteer gardener.", amount: 9, postedBy: "Fifth Street Growers" },
      { title: "A community lunch", detail: "One lunch at the Sunday garden table.", amount: 7, postedBy: "Harvest Hub Pantry" },
      { title: "Compost for the beds", detail: "A bag of compost to feed the soil.", amount: 11, postedBy: "Fifth Street Growers" },
      { title: "A cooking class seat", detail: "Learn to cook with what grows in the garden.", amount: 12, postedBy: "Harvest Hub Pantry" },
    ],
  },
];

// Turn a seed into a real Mural: build its tiles, drop the seed-only fields.
function toMural(seed: SeedMural): Mural {
  return {
    slug: seed.slug,
    pageOrder: seed.pageOrder,
    title: seed.title,
    location: seed.location,
    imageSrc: seed.imageSrc,
    imageAlt: seed.imageAlt,
    gridSize: seed.gridSize,
    isAiSample: seed.isAiSample,
    finaleTileId: seed.finaleTileId,
    tiles: buildTiles(seed),
  };
}

export const SEED_MURALS: Mural[] = SEEDS.map(toMural);
