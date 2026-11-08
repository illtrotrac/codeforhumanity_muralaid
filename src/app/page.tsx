import { connection } from "next/server";
import { Suspense } from "react";
import { Storybook } from "@/components/storybook/Storybook";
import { listMurals } from "@/server/murals";

// Home: the book of colouring pages. The heading is static and sent
// instantly; the book streams in once the database has answered.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-6 px-6 pb-10 pt-6 lg:pt-8">
      <header className="flex max-w-[46ch] flex-col items-center gap-2 text-center">
        <p className="font-mono text-label uppercase text-ink-muted">A book of colouring pages</p>
        <h1 className="font-display text-title text-ink-strong text-balance">
          Every page tells a neighbour&apos;s story
        </h1>
        <p className="text-ink-muted">
          Turn the pages, choose a colouring page, and fund a section to colour it in.
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
