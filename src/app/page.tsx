import { Mural } from "@/components/mural/Mural";
import { sampleMural } from "@/data/sample-mural";

export default function Home() {
  const total = sampleMural.tiles.length;
  const restored = sampleMural.tiles.filter((t) => t.status === "restored").length;

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-24">
      <header className="flex flex-col gap-6">
        <p className="font-mono text-label uppercase text-ink-muted">
          {sampleMural.location}
        </p>
        <h1 className="font-display text-display text-ink-strong text-balance">
          {sampleMural.title}
        </h1>
        <p className="max-w-[48ch] text-lg text-ink-muted">
          Each tile is a real need from a neighbour: a hot meal, a winter coat,
          a volunteer shift. Meet one, and that part of the wall gets its colour
          back.
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-ink">
            <span className="font-display text-title text-ink-strong tabular-nums">
              {restored}
            </span>{" "}
            <span className="text-ink-muted">of {total} tiles restored</span>
          </p>
          <div
            role="progressbar"
            aria-label="Mural progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={restored}
            className="h-1 w-full max-w-sm overflow-hidden rounded-pill bg-surface-raised"
          >
            <div
              className="h-full rounded-pill bg-accent"
              style={{ width: `${(restored / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <Mural mural={sampleMural} />
    </main>
  );
}
