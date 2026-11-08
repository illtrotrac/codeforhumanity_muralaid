import { connection } from "next/server";
import { Suspense } from "react";
import { Storybook } from "@/components/storybook/Storybook";
import { listMurals } from "@/server/murals";

// Home: the storybook. The heading is static and sent instantly; the book
// streams in once the database has answered.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-8 px-6 pb-12 pt-8 lg:pt-10">
      <header className="flex max-w-[44ch] flex-col items-center gap-2 text-center">
        <p className="font-mono text-label uppercase text-ink-muted">The book of murals</p>
        <h1 className="font-display text-title text-ink-strong text-balance">
          Every wall tells a neighbour&apos;s story.
        </h1>
        <p className="text-ink-muted">
          Turn the pages, pick a mural, and fund a tile to bring its colour back.
        </p>
      </header>
      <Suspense fallback={<p className="text-ink-muted">Opening the book…</p>}>
        <StorybookLoader />
      </Suspense>
    </main>
  );
}

async function StorybookLoader() {
  await connection(); // live progress: render per request, never pre-build
  return <Storybook murals={listMurals()} />;
}
