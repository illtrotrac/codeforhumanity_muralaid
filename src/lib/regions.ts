import { Delaunay } from "d3-delaunay";

// Cuts a mural into colouring-book regions, one per tile.
//
// Coordinates are in "tile units": an 8x8 mural is 8 wide and 8 tall, so
// the SVG never needs to know the image's pixel size.

export type Point = [number, number];

export type Region = {
  id: number; // the tile this region belongs to
  paths: string[]; // SVG path data (the finale has two: its cell + its traced shape)
  bbox: [number, number, number, number]; // x0, y0, x1, y1
  centre: Point;
};

// A tiny seeded random number generator (mulberry32). Same seed, same
// sequence, every time, on the server and in every browser. Math.random()
// would cut the mural differently on each page load.
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const JITTER = 0.75; // how far (in tiles) points may wander from the grid: 0 = squares

function toPath(points: Point[]): string {
  return `M${points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join("L")}Z`;
}

function boundsOf(points: Point[]): Region["bbox"] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

type Finale = { tileId: number; shape: Point[] };

export function buildRegions(cols: number, rows: number, seed: string, finale?: Finale): Region[] {
  const random = seededRandom(seed);

  // One point per tile, in tile order (left to right, top to bottom), each
  // nudged randomly away from its square's centre.
  const points: Point[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      points.push([col + 0.5 + (random() - 0.5) * JITTER, row + 0.5 + (random() - 0.5) * JITTER]);
    }
  }

  // Voronoi: every spot on the mural belongs to its nearest point. The
  // result is a set of irregular cells that fit together with no gaps.
  const voronoi = Delaunay.from(points).voronoi([0, 0, cols, rows]);

  return points.map((centre, index) => {
    const cell = (voronoi.cellPolygon(index) ?? []) as Point[];
    const id = index + 1;
    // The finale tile also owns its hand-traced object (the coat, the sun...).
    const outline = finale?.tileId === id ? [...cell, ...finale.shape] : cell;
    const paths = finale?.tileId === id ? [toPath(cell), toPath(finale.shape)] : [toPath(cell)];
    return { id, paths, bbox: boundsOf(outline), centre };
  });
}

export function shapeToPath(shape: Point[]): string {
  return toPath(shape);
}

// Back-and-forth crayon strokes covering a region's bounding box. Clipped to
// the region and drawn on gradually, they look like someone colouring it in.
export function scribblePath([x0, y0, x1, y1]: Region["bbox"], step = 0.14): string {
  let d = `M${x0.toFixed(2)},${y0.toFixed(2)}`;
  let down = true;
  for (let x = x0 + step; x <= x1 + step; x += step) {
    d += `L${x.toFixed(2)},${(down ? y1 : y0).toFixed(2)}`;
    down = !down;
  }
  return d;
}
