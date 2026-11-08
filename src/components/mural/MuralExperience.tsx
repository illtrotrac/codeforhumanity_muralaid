"use client";

import { useState, type ReactNode } from "react";
import { MuralMagic, TAP_MS } from "@/components/magic/MuralMagic";
import { playChime } from "@/lib/chime";
import { Mural } from "./Mural";
import { useMural } from "./MuralStore";
import { NeedPanel } from "./NeedPanel";

type MuralExperienceProps = {
  children: ReactNode; // the static intro, rendered on the server
};

// The interactive part of the home page. The tiles come from the shared
// store; this component only keeps UI state (which panel is open, whether
// the celebration is playing).
export function MuralExperience({ children }: MuralExperienceProps) {
  const { mural, tiles, pledge, skipToFinale, reset } = useMural();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [justRestoredId, setJustRestoredId] = useState<number | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);

  // Derived values: worked out from state on every render, never stored.
  const selectedTile = tiles.find((t) => t.id === selectedId) ?? null;
  const total = tiles.length;
  const restored = tiles.filter((t) => t.status === "restored").length;
  const isComplete = restored === total;

  function handlePledge(id: number) {
    pledge(id);
    setSelectedId(null);
    setJustRestoredId(id);

    // Was this the last locked tile? We decide here, inside the click, so the
    // chime is allowed to play (browsers block sound that isn't from a click).
    const lockedBefore = tiles.filter((t) => t.status === "locked");
    if (lockedBefore.length === 1 && lockedBefore[0].id === id) {
      setIsCelebrating(true);
      playChime(TAP_MS / 1000);
    }
  }

  function handleSkipToFinale() {
    skipToFinale();
    setJustRestoredId(null);
    setIsCelebrating(false);
  }

  function handleReset() {
    reset();
    setJustRestoredId(null);
    setIsCelebrating(false);
  }

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <header className="flex flex-col gap-6">
        {children}

        <div className="flex flex-col gap-2">
          <p>
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
              className="h-full rounded-pill bg-accent transition-[width] duration-700 ease-out-soft"
              style={{ width: `${(restored / total) * 100}%` }}
            />
          </div>
        </div>

        {isComplete && (
          <p className="font-display text-title text-accent">The wall is whole again.</p>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <button
            type="button"
            onClick={handleSkipToFinale}
            className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
          >
            Skip to final tile
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
          >
            Reset demo
          </button>
        </div>
      </header>

      <Mural
        mural={mural}
        tiles={tiles}
        justRestoredId={justRestoredId}
        isComplete={isComplete}
        isCelebrating={isCelebrating}
        onSelectTile={setSelectedId}
      >
        {isCelebrating && <MuralMagic onDone={() => setIsCelebrating(false)} />}
      </Mural>

      <NeedPanel
        tile={selectedTile}
        onClose={() => setSelectedId(null)}
        onPledge={handlePledge}
      />

      {/* Screen readers announce changes to this region out loud. */}
      <p aria-live="polite" className="sr-only">
        {isComplete && justRestoredId !== null
          ? "Mural complete! Every tile has its colour back."
          : justRestoredId !== null &&
            `Tile ${justRestoredId} restored. ${restored} of ${total} tiles restored.`}
      </p>
    </div>
  );
}
