import type { Metadata } from "next";
import { Suspense } from "react";
import { CommunityNotes } from "@/components/notes/CommunityNotes";

export const metadata: Metadata = {
  title: "Community notes",
};

// /notes, or /notes?page=the-long-table for one colouring page's notes.
export default function NotesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:py-16">
      <header className="mx-auto flex max-w-[46ch] flex-col items-center gap-2 text-center">
        <p className="font-mono text-label uppercase text-ink-muted">Community notes</p>
        <h1 className="font-display text-title text-ink-strong text-balance">
          Little notes tucked into the book
        </h1>
        <p className="text-ink-muted">
          Every section someone colours in can carry a note. Here they all are.
        </p>
      </header>
      <Suspense fallback={<p className="text-center text-ink-muted">Gathering the notes…</p>}>
        <NotesLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NotesLoader({ searchParams }: Pick<PageProps<"/notes">, "searchParams">) {
  const { page } = await searchParams;
  return <CommunityNotes pageSlug={typeof page === "string" ? page : null} />;
}
