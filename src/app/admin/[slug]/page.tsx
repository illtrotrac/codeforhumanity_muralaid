import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminBoard } from "@/components/admin/AdminBoard";
import { getMural } from "@/server/murals";

export const metadata: Metadata = {
  title: "Shelter admin · MuralAid",
};

// /admin/the-long-table: edit the needs on one mural.
export default function AdminMuralPage({ params }: PageProps<"/admin/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 lg:py-16">
      <Suspense fallback={<p className="text-ink-muted">Opening the mural…</p>}>
        <AdminLoader params={params} />
      </Suspense>
    </main>
  );
}

async function AdminLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const mural = getMural(slug);
  if (!mural) notFound();
  return <AdminBoard mural={mural} />;
}
