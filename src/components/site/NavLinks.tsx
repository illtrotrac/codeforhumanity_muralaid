"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// match: which URLs count as "inside" this section, for highlighting.
const LINKS = [
  { href: "/", label: "Murals", match: (p: string) => p === "/" || p.startsWith("/murals") },
  { href: "/admin", label: "Shelter admin", match: (p: string) => p.startsWith("/admin") },
];

// A client component only because it needs usePathname() to know which
// link is the current page. The URL is only known at request time, so the
// header wraps this in <Suspense> with NavList as the fallback.
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

// The links themselves. With pathname null (the fallback, before the URL is
// known) nothing is highlighted, but every link already works.
export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1">
      {LINKS.map(({ href, label, match }) => {
        const isCurrent = pathname !== null && match(pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isCurrent ? "page" : undefined}
              className="rounded-pill px-4 py-2 text-sm text-ink-muted transition-colors duration-300 ease-out-soft hover:text-ink aria-[current=page]:bg-surface-raised aria-[current=page]:text-ink-strong"
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
