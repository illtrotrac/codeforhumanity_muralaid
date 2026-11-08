import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { MuralShelf, MuralShelfFallback } from "@/components/murals/MuralShelf";
import { getCurrentAdmin } from "@/server/auth";

// The folder name "admin" makes this page live at /admin.
export const metadata: Metadata = {
  title: "Shelter admin · MuralAid",
};

export default function AdminIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:py-16">
      <Suspense fallback={<MuralShelfFallback />}>
        <AdminHome />
      </Suspense>
    </main>
  );
}

async function AdminHome() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-label uppercase text-ink-muted">
            Shelter admin · {admin.organisationName ?? "All organisations"}
          </p>
          <h1 className="font-display text-title text-ink-strong">Choose a mural to manage</h1>
        </div>
        <p className="flex items-center gap-4 text-sm text-ink-muted">
          {admin.email}
          <SignOutButton />
        </p>
      </header>
      {/* Organisation admins only see their own murals. */}
      <MuralShelf basePath="/admin" organisationSlug={admin.organisationSlug} />
    </>
  );
}
