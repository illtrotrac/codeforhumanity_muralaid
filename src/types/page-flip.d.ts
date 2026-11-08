// page-flip (StPageFlip, MIT) ships without TypeScript types, so this
// declares just the parts we use. Read from the library's own source
// (node_modules/page-flip/dist/js/page-flip.module.js), defaults noted.
declare module "page-flip" {
  export type PageFlipSettings = {
    width: number; // one page's width, in px
    height: number; // one page's height, in px
    size?: "fixed" | "stretch"; // "stretch" fits the container, within min/max
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    startPage?: number; // default 0
    showCover?: boolean; // first/last pages as hard covers; default false
    usePortrait?: boolean; // single page on narrow screens; default true
    flippingTime?: number; // ms per flip; default 1000
    drawShadow?: boolean; // default true
    maxShadowOpacity?: number; // 0..1; default 1
    mobileScrollSupport?: boolean; // default true
    useMouseEvents?: boolean; // drag/click page corners; default true
    showPageCorners?: boolean; // corner peeks on hover; default true
  };

  export type FlipEvent = { data: number }; // the new page index

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(pages: HTMLElement[]): void;
    flip(page: number): void; // animated
    turnToPage(page: number): void; // instant
    getCurrentPageIndex(): number;
    getPageCount(): number;
    on(event: "flip", handler: (event: FlipEvent) => void): this;
    destroy(): void;
  }
}
