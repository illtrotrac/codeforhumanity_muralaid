import { lineArtFor } from "@/lib/line-art";
import type { Mural, MuralTile, Need, Organisation } from "@/lib/types";

// The sample data a fresh database starts with: one organisation per
// sector, one mural per organisation, one storybook page per mural.
// All artwork is AI-generated and every organisation is fictional.

export const SEED_ORGANISATIONS: Organisation[] = [
  {
    slug: "harbour-house-shelter",
    name: "Harbour House Shelter",
    sector: "Homelessness",
    tagline: "Warm beds, hot meals and a way back to a home of your own.",
    isVerified: true,
  },
  {
    slug: "lantern-learning-trust",
    name: "Lantern Learning Trust",
    sector: "Education & youth",
    tagline: "Free tutoring, books and makerspaces for curious young minds.",
    isVerified: true,
  },
  {
    slug: "common-ground-growers",
    name: "Common Ground Growers",
    sector: "Food security",
    tagline: "Neighbourhood gardens that turn empty lots into fresh food.",
    isVerified: true,
  },
  {
    slug: "second-chance-paws",
    name: "Second Chance Paws Rescue",
    sector: "Animal welfare",
    tagline: "Rescuing, healing and rehoming the city's stray cats and dogs.",
    isVerified: true,
  },
  {
    slug: "little-harbour-childrens-home",
    name: "Little Harbour Children's Home",
    sector: "Children in care",
    tagline: "A safe, loving home for children who can't live with their families.",
    isVerified: true,
  },
];

// A circle as a polygon, for round finale objects like the sun.
function circle(cx: number, cy: number, r: number, points = 16): Array<[number, number]> {
  return Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    return [+(cx + r * Math.cos(a)).toFixed(3), +(cy + r * Math.sin(a)).toFixed(3)];
  });
}

type SeedMural = Omit<Mural, "tiles" | "organisation" | "lineArtSrc"> & {
  organisationSlug: string;
  needs: Need[]; // handed out to tiles in rotation
  finaleNeed: Need; // the need on finaleTileId
  restoredIds: number[]; // tiles that start in colour, so the demo isn't empty
};

function buildTiles(seed: SeedMural): MuralTile[] {
  const restored = new Set(seed.restoredIds);
  return Array.from({ length: seed.gridCols * seed.gridRows }, (_, index) => {
    const id = index + 1;
    return {
      id,
      row: Math.floor(index / seed.gridCols),
      col: index % seed.gridCols,
      status: restored.has(id) ? "restored" : "locked",
      need: id === seed.finaleTileId ? seed.finaleNeed : seed.needs[index % seed.needs.length],
      note: null, // seeded "already funded" tiles have no real donor behind them
      delivery: null,
    };
  });
}

const SEEDS: SeedMural[] = [
  {
    slug: "the-long-table",
    organisationSlug: "harbour-house-shelter",
    pageOrder: 1,
    title: "The Long Table",
    location: "Sample wall · Riverside",
    imageSrc: "/mural/sample.jpg",
    imageAlt:
      "A painted street mural of neighbours sharing a meal at a long table, while a family hands a red winter coat to a young man under a sunrise over colourful houses.",
    gridCols: 8,
    gridRows: 8,
    isAiSample: true,
    finaleTileId: 46, // the red coat
    finaleShape: [[5.7, 4.6], [6.0, 4.64], [6.32, 4.8], [6.52, 5.24], [6.6, 6.0], [6.52, 6.4], [6.0, 6.44], [5.44, 6.4], [5.24, 5.92], [5.32, 5.16], [5.52, 4.76]],
    restoredIds: [1, 2, 8, 13, 15, 20, 23, 29, 31, 34],
    finaleNeed: { title: "A winter coat", detail: "Your $15 completes a warm coat for a teenager before the first frost.", amount: 15 },
    needs: [
      { title: "A hot meal", detail: "One dinner from the community kitchen, served tonight.", amount: 8 },
      { title: "A week of bus fare", detail: "Gets someone to a new job for their first week.", amount: 12 },
      { title: "A month of phone credit", detail: "Keeps a job seeker reachable by employers.", amount: 10 },
      { title: "A toiletries kit", detail: "Soap, toothbrush and razor for a new arrival.", amount: 6 },
      { title: "Groceries for a family", detail: "A week of staples for a family of four.", amount: 25 },
      { title: "A warm blanket", detail: "For a new arrival at the overnight shelter.", amount: 9 },
      { title: "A week of laundry", detail: "Clean clothes for job interviews.", amount: 7 },
    ],
  },
  {
    slug: "the-learning-circle",
    organisationSlug: "lantern-learning-trust",
    pageOrder: 2,
    title: "The Learning Circle",
    location: "Sample wall · Southside Library",
    imageSrc: "/mural/learning-circle.jpg",
    imageAlt:
      "A painted mural titled The Learning Circle: an older man and a girl read a glowing open book, surrounded by children, a makerspace with robots, a community library shelf and a painter at an easel.",
    gridCols: 8,
    gridRows: 8,
    isAiSample: true,
    finaleTileId: 37, // the glowing book
    finaleShape: [[2.7, 4.3], [4.1, 4.0], [5.5, 4.24], [5.6, 5.4], [4.1, 5.64], [2.6, 5.44]],
    restoredIds: [3, 6, 11, 19, 26, 40, 44, 52, 58, 63],
    finaleNeed: { title: "Storybooks for the circle", detail: "Your $20 completes a box of new picture books for the Saturday reading circle.", amount: 20 },
    needs: [
      { title: "Books for the reading corner", detail: "Three new chapter books chosen by the kids.", amount: 12 },
      { title: "An hour of tutoring", detail: "One-to-one maths help before exams.", amount: 15 },
      { title: "Robotics club parts", detail: "Motors and sensors for the makerspace team.", amount: 20 },
      { title: "A seat on the museum trip", detail: "Covers the bus and entry for one student.", amount: 18 },
      { title: "Art supplies for a term", detail: "Paints, brushes and paper for one young artist.", amount: 10 },
      { title: "Laptop repair", detail: "Fixes a student's laptop so they can do homework.", amount: 25 },
      { title: "A library bus pass", detail: "A month of rides to the library after school.", amount: 8 },
    ],
  },
  {
    slug: "the-urban-harvest",
    organisationSlug: "common-ground-growers",
    pageOrder: 3,
    title: "The Urban Harvest",
    location: "Sample wall · Fifth Street garden lot",
    imageSrc: "/mural/urban-harvest.jpg",
    imageAlt:
      "A bright mural titled The Urban Harvest Community Hub: neighbours plant carrots and tomatoes in a community garden under a big sun, beside a fresh produce stall and tall sunflowers.",
    gridCols: 6,
    gridRows: 6,
    isAiSample: true,
    finaleTileId: 10, // the sun
    finaleShape: circle(3.0, 1.5, 0.42),
    restoredIds: [2, 7, 14, 21, 30, 33],
    finaleNeed: { title: "Grow lights for winter", detail: "Your $25 keeps the greenhouse growing through winter, so the harvest never stops.", amount: 25 },
    needs: [
      { title: "Seed packets for a bed", detail: "Enough seeds to plant one raised garden bed.", amount: 6 },
      { title: "A fresh produce box", detail: "A week of vegetables for a family, picked here.", amount: 14 },
      { title: "Gloves and a trowel", detail: "Tools for a new volunteer gardener.", amount: 9 },
      { title: "A community lunch", detail: "One lunch at the Sunday garden table.", amount: 7 },
      { title: "Compost for the beds", detail: "A bag of compost to feed the soil.", amount: 11 },
      { title: "A cooking class seat", detail: "Learn to cook with what grows in the garden.", amount: 12 },
    ],
  },
  {
    slug: "second-chances",
    organisationSlug: "second-chance-paws",
    pageOrder: 4,
    title: "Second Chances",
    location: "Sample wall · Old Mill Street",
    imageSrc: "/mural/second-chance-paws.jpg",
    imageAlt:
      "A textured gold and teal mural of a smiling golden retriever and a tabby cat, surrounded by rabbits, birds, sunflowers and a radiant sun, painted on a brick wall.",
    gridCols: 11, // 1408 x 768 image: 11 x 6 tiles of exactly 128px
    gridRows: 6,
    isAiSample: true,
    finaleTileId: 28, // the golden retriever's face
    finaleShape: [[4.81, 1.43], [5.91, 1.05], [7.01, 1.43], [7.43, 2.4], [7.01, 3.45], [5.91, 3.98], [4.81, 3.53], [4.4, 2.48]],
    restoredIds: [3, 9, 15, 20, 34, 41, 50, 57, 63],
    finaleNeed: { title: "Biscuit's adoption kit", detail: "Your $20 completes the kit so Biscuit, our golden retriever, can go home this weekend.", amount: 20 },
    needs: [
      { title: "A week of food for a rescue dog", detail: "Good food while they wait for a family.", amount: 10 },
      { title: "Kitten vaccinations", detail: "First jabs for a kitten found on the street.", amount: 18 },
      { title: "A cosy kennel bed", detail: "Somewhere soft to sleep after a rough start.", amount: 12 },
      { title: "Flea treatment for a litter", detail: "Keeps five puppies healthy and comfortable.", amount: 9 },
      { title: "A microchip", detail: "So a rehomed pet can always find its way back.", amount: 15 },
      { title: "Toys for the cat room", detail: "Play keeps shelter cats calm and happy.", amount: 6 },
      { title: "A vet check-up", detail: "A full health check for a new arrival.", amount: 25 },
    ],
  },
  {
    slug: "a-place-to-belong",
    organisationSlug: "little-harbour-childrens-home",
    pageOrder: 5,
    title: "A Place to Belong",
    location: "Sample wall · Harbour Road",
    imageSrc: "/mural/little-harbour.jpg",
    imageAlt:
      "A textured mural of smiling children with a shaggy dog, framed by storybooks, a robot, paper planes, a golden sun and drawings of families, painted on a brick wall.",
    gridCols: 11,
    gridRows: 6,
    isAiSample: true,
    finaleTileId: 19, // the open storybook
    finaleShape: [[6.74, 1.17], [7.29, 1.08], [7.84, 1.17], [7.89, 1.62], [7.29, 1.68], [6.68, 1.59]],
    restoredIds: [2, 7, 12, 25, 31, 38, 46, 53, 60, 65],
    finaleNeed: { title: "Bedtime stories for every room", detail: "Your $20 completes a shelf of storybooks so every child has one by their bed.", amount: 20 },
    needs: [
      { title: "School shoes", detail: "A new pair of school shoes for one child.", amount: 20 },
      { title: "A birthday party kit", detail: "Cake, candles and a present, so no birthday goes unnoticed.", amount: 12 },
      { title: "Swimming lessons for a term", detail: "Weekly lessons at the local pool.", amount: 25 },
      { title: "Art club supplies", detail: "Paints and sketchbooks for after-school art club.", amount: 8 },
      { title: "A day trip to the coast", detail: "Train tickets and lunch for one child.", amount: 15 },
      { title: "A homework desk lamp", detail: "Good light for evening homework.", amount: 9 },
      { title: "Football club fees", detail: "A season with the local junior team.", amount: 14 },
    ],
  },
];

export type SeedMuralWithOrg = Mural & { organisationSlug: string };

// Turn a seed into a real Mural: build its tiles, attach its organisation.
function toMural(seed: SeedMural): SeedMuralWithOrg {
  const organisation = SEED_ORGANISATIONS.find((o) => o.slug === seed.organisationSlug);
  if (!organisation) throw new Error(`Seed mural ${seed.slug} has unknown organisation ${seed.organisationSlug}`);
  return {
    slug: seed.slug,
    pageOrder: seed.pageOrder,
    title: seed.title,
    location: seed.location,
    imageSrc: seed.imageSrc,
    imageAlt: seed.imageAlt,
    gridCols: seed.gridCols,
    gridRows: seed.gridRows,
    lineArtSrc: lineArtFor(seed.imageSrc),
    isAiSample: seed.isAiSample,
    finaleTileId: seed.finaleTileId,
    finaleShape: seed.finaleShape,
    organisationSlug: seed.organisationSlug,
    organisation,
    tiles: buildTiles(seed),
  };
}

export const SEED_MURALS: SeedMuralWithOrg[] = SEEDS.map(toMural);
