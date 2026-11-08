// By convention, /mural/sample.jpg has its colouring page at
// /mural/line/sample.png (made by `npm run line-art`).
export function lineArtFor(imageSrc: string): string {
  return imageSrc.replace("/mural/", "/mural/line/").replace(/\.jpe?g$/i, ".png");
}
