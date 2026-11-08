import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { listMurals } from "@/server/murals";

type MuralShelfProps = {
  basePath: "/murals" | "/admin"; // where each card links to
  organisationSlug?: string | null; // show only this organisation's murals (null/undefined = all)
};

// A grid of mural cards, read straight from the database. Server
// Components can call the repository directly; only the browser has to go
// through the HTTP API.
export async function MuralShelf({ basePath, organisationSlug }: MuralShelfProps) {
  await connection(); // live data: render per request, never pre-build
  const murals = listMurals().filter(
    (m) => !organisationSlug || m.organisation.slug === organisationSlug,
  );

  return (
    <ul role="list" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {murals.map((m) => {
        const percent = Math.round((m.restoredTiles / m.totalTiles) * 100);
        return (
          <li key={m.slug}>
            <Link
              href={`${basePath}/${m.slug}`}
              className="group flex flex-col gap-4 rounded-panel bg-surface p-3 shadow-soft transition-all duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="overflow-hidden rounded-[calc(var(--radius-panel)-8px)]">
                <Image
                  src={m.imageSrc}
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-square w-full object-cover grayscale-[0.7] transition-all duration-700 ease-out-soft group-hover:scale-105 group-hover:grayscale-0"
                />
              </div>
              <div className="flex flex-col gap-2 px-2 pb-2">
                <p className="font-mono text-label uppercase text-ink-muted">
                  Page {m.pageOrder} · {m.organisation.sector}
                </p>
                <h2 className="font-display text-2xl tracking-tight text-ink-strong">{m.title}</h2>
                <p className="text-sm text-ink">{m.organisation.name}</p>
                <p className="text-sm text-ink-muted">
                  {m.restoredTiles} of {m.totalTiles} tiles restored · {percent}%
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MuralShelfFallback() {
  return <p className="text-ink-muted">Gathering the murals…</p>;
}
