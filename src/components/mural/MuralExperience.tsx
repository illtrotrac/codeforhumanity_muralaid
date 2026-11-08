"use client";

import { useState, type ReactNode } from "react";
import type { Mural as MuralData } from "@/data/sample-mural";
import { MuralMagic, TAP_MS } from "@/components/magic/MuralMagic";
import { playChime } from "@/lib/chime";
import { Mural } from "./Mural";
import { NeedPanel } from "./NeedPanel";

type MuralExperienceProps = {
  mural: MuralData;
  children: ReactNode; // the static intro, rendered on the server
};

// The interactive part of the page. It owns all the state; Mural and
// NeedPanel just display it and report clicks back up.
export function MuralExperience({ mural, children }: MuralExperienceProps) {
  const [tiles, setTiles] = useState(mural.tiles);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [justRestoredId, setJustRestoredId] = useState<number | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);

  // Derived values: worked out from state on every render, never stored.
  const selectedTile = tiles.find((t) => t.id === selectedId) ?? null;
  const total = tiles.length;
  const restored = tiles.filter((t) => t.status === "restored").length;
  const isComplete = restored === total;

  function handlePledge(id: number) {
    // Never change state in place: build a new array with one tile replaced.
    setTiles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "restored" } : t)),
    );
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

  // Demo helper: restore everything except the finale tile, so one live
  // pledge on stage completes the mural.
  function handleSkipToFinale() {
    setTiles((prev) =>
      prev.map((t) => ({ ...t, status: t.id === mural.finaleTileId ? "locked" : "restored" })),
    );
    setJustRestoredId(null);
    setIsCelebrating(false);
  }

  function handleReset() {
    setTiles(mural.tiles);
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
