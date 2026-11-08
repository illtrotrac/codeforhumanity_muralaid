"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Mural" },
  { href: "/admin", label: "Shelter admin" },
];

// A client component only because it needs usePathname() to know which
// link is the current page.
export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const isCurrent = pathname === href;
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
