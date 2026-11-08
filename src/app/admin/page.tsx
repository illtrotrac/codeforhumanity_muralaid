import type { Metadata } from "next";
import { Suspense } from "react";
import { MuralShelf, MuralShelfFallback } from "@/components/murals/MuralShelf";

// The folder name "admin" makes this page live at /admin.
export const metadata: Metadata = {
  title: "Shelter admin · MuralAid",
};

export default function AdminIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:py-16">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-label uppercase text-ink-muted">
          Shelter admin · demo mode, no sign-in
        </p>
        <h1 className="font-display text-title text-ink-strong">Choose a mural to manage</h1>
      </header>
      <Suspense fallback={<MuralShelfFallback />}>
        <MuralShelf basePath="/admin" />
      </Suspense>
    </main>
  );
}
