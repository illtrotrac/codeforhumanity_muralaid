import Link from "next/link";
import { NavLinks } from "./NavLinks";

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
          MuralAid
        </Link>
        <NavLinks />
      </nav>
    </header>
  );
}
