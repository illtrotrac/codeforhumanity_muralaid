import Link from "next/link";
import { Suspense } from "react";
import { NavLinks, NavList } from "./NavLinks";

// A frosted bar that stays at the top while the page scrolls under it.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-glass backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3"
      >
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-ink-strong"
        >
          {/* The one word in colour is the brand idea in miniature */}
          <span className="italic text-accent">Colour</span> for Community
        </Link>
        <Suspense fallback={<NavList pathname={null} />}>
          <NavLinks />
        </Suspense>
      </nav>
    </header>
  );
}
