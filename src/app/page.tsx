import { Suspense } from "react";
import { MuralShelf, MuralShelfFallback } from "@/components/murals/MuralShelf";

// Home: every mural, one card each. The heading is static and sent
// instantly; the cards stream in once the database has answered.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-16 lg:py-24">
      <header className="flex max-w-[52ch] flex-col gap-4">
        <p className="font-mono text-label uppercase text-ink-muted">MuralAid</p>
        <h1 className="font-display text-display text-ink-strong text-balance">
          Every wall tells a neighbour&apos;s story.
        </h1>
        <p className="text-lg text-ink-muted">
          Each mural is made of real needs. Fund one, and that part of the wall
          gets its colour back.
        </p>
      </header>
      <Suspense fallback={<MuralShelfFallback />}>
        <MuralShelf basePath="/murals" />
      </Suspense>
    </main>
  );
}
