import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import type { CommunityNote } from "@/lib/types";
import { listCommunityNotes, listMurals } from "@/server/murals";

const SLIP_COLOURS = ["--note-butter", "--note-blush", "--note-sage", "--note-paper"];
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// Each slip gets its own small tilt and paper colour, picked from its id so
// it looks the same on every visit (and on server and browser alike).
function slipStyle(note: CommunityNote): CSSProperties {
  return {
    "--slip-tilt": `${((note.id * 37) % 7) - 3}deg`,
    "--slip-colour": `var(${SLIP_COLOURS[note.id % SLIP_COLOURS.length]})`,
  } as CSSProperties;
}

type CommunityNotesProps = {
  pageSlug: string | null; // show one colouring page's notes, or all
};

// The community notes wall: every note donors left, as handwritten slips.
export async function CommunityNotes({ pageSlug }: CommunityNotesProps) {
  await connection(); // live data: render per request, never pre-build
  const pages = listMurals();
  const validSlug = pages.some((p) => p.slug === pageSlug) ? pageSlug : null;
  const notes = listCommunityNotes(validSlug);

  return (
    <div className="flex flex-col gap-8">
      {/* Filter by colouring page. Plain links, so filters are shareable URLs. */}
      <nav aria-label="Filter notes by colouring page">
        <ul className="flex flex-wrap justify-center gap-2">
          {[{ slug: null, title: "All pages" }, ...pages].map((p) => (
            <li key={p.slug ?? "all"}>
              <Link
                href={p.slug ? `/notes?page=${p.slug}` : "/notes"}
                aria-current={p.slug === validSlug ? "page" : undefined}
                className="block rounded-pill px-4 py-2 text-sm text-ink-muted ring-1 ring-line-strong transition-all duration-300 ease-out-soft hover:text-ink hover:ring-ink aria-[current=page]:bg-accent aria-[current=page]:text-accent-ink aria-[current=page]:ring-accent"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {notes.length === 0 ? (
        <p className="text-center text-ink-muted">
          No notes here yet. Fund a section and leave the first one.
        </p>
      ) : (
        <ul className="notes-wall">
          {notes.map((note) => (
            <li key={note.id} className="note-slip" style={slipStyle(note)}>
              <figure className="flex flex-col gap-3">
                <blockquote className="font-hand text-2xl leading-snug text-ink-strong">
                  {note.message}
                </blockquote>
                <figcaption className="flex flex-col gap-1 text-sm">
                  <span className="text-ink">— {note.donorName ?? "A neighbour"}</span>
                  <span className="text-ink-muted">
                    for {note.needTitle.toLowerCase()} ·{" "}
                    <Link href={`/murals/${note.muralSlug}`} className="underline-offset-2 hover:underline">
                      {note.muralTitle}
                    </Link>
                  </span>
                  <span className="flex items-center gap-2 font-mono text-label uppercase text-ink-muted">
                    {dateFormat.format(new Date(note.at))}
                    {note.delivered && <span className="text-accent">· ✓ Delivered</span>}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
