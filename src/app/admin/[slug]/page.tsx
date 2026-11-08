import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminBoard } from "@/components/admin/AdminBoard";
import { canManage, getCurrentAdmin } from "@/server/auth";
import { getMural } from "@/server/murals";

export const metadata: Metadata = {
  title: "Shelter admin",
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
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const mural = getMural(slug);
  // Another organisation's mural looks the same as a missing one, so admins
  // can't discover what else exists by guessing URLs.
  if (!mural || !canManage(admin, mural.organisation.slug)) notFound();
  return <AdminBoard mural={mural} />;
}
