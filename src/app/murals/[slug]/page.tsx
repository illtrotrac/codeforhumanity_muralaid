import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MuralExperience } from "@/components/mural/MuralExperience";
import { getMural } from "@/server/murals";

// /murals/the-long-table, /murals/the-urban-harvest, ...
export default function MuralPage({ params }: PageProps<"/murals/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 lg:py-24">
      <Suspense fallback={<p className="text-ink-muted">Opening the mural…</p>}>
        <MuralLoader params={params} />
      </Suspense>
    </main>
  );
}

// Reads the mural from the database at request time, inside Suspense.
async function MuralLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const mural = getMural(slug);
  if (!mural) notFound(); // shows Next's 404 page

  return (
    <MuralExperience mural={mural}>
      <p className="font-mono text-label uppercase text-ink-muted">{mural.location}</p>
      <h1 className="font-display text-display text-ink-strong text-balance">{mural.title}</h1>
      <p className="max-w-[48ch] text-lg text-ink-muted">
        Each tile is a real need from a neighbour. Fund one, and that part of
        the wall gets its colour back.
      </p>
    </MuralExperience>
  );
}
