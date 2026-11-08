"use client";

import { useState, type ReactNode } from "react";
import { MuralMagic, TAP_MS } from "@/components/magic/MuralMagic";
import { playChime } from "@/lib/chime";
import type { DonorNote, Mural as MuralData, PledgeActivity } from "@/lib/types";
import { KindnessTicker } from "./KindnessTicker";
import { Mural } from "./Mural";
import { NeedPanel } from "./NeedPanel";
import { useMuralState } from "./useMuralState";

const TICKER_LENGTH = 5;

type MuralExperienceProps = {
  mural: MuralData; // loaded from the database by the page, on the server
  recentPledges: PledgeActivity[]; // newest first
  canRunDemo: boolean; // show the rehearsal controls (signed-in admins only)
  children: ReactNode; // the static intro, rendered on the server
};

// The interactive part of a mural page. Tile data, saving and the live
// stream live in useMuralState; this component keeps UI state (which panel
// is open, whether the celebration is playing, the ticker).
export function MuralExperience({
  mural: initialMural,
  recentPledges,
  canRunDemo,
  children,
}: MuralExperienceProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [justRestoredId, setJustRestoredId] = useState<number | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [pledges, setPledges] = useState(recentPledges);

  const { mural, tiles, error, isLive, pledge, runDemo } = useMuralState(initialMural, {
    onPledge: (p) => {
      // Newest first; drop a duplicate if the same pledge arrives twice.
      setPledges((prev) =>
        [p, ...prev.filter((x) => !(x.tileId === p.tileId && x.at === p.at))].slice(0, TICKER_LENGTH),
      );
      setJustRestoredId(p.tileId); // someone else's tile blooms too
    },
    // Someone else finished the wall while we watched: celebrate here too.
    // (No chime: browsers only allow sound right after the viewer clicks.)
    onRemoteComplete: () => setIsCelebrating(true),
  });

  // Derived values: worked out from state on every render, never stored.
  const selectedTile = tiles.find((t) => t.id === selectedId) ?? null;
  const total = tiles.length;
  const restored = tiles.filter((t) => t.status === "restored").length;
  const isComplete = restored === total;

  function handlePledge(id: number, note: DonorNote) {
    // Was this the last locked tile? We decide here, inside the click and
    // before any waiting, so the chime is allowed to play (browsers block
    // sound that doesn't come straight from a click).
    const lockedBefore = tiles.filter((t) => t.status === "locked");
    if (lockedBefore.length === 1 && lockedBefore[0].id === id) {
      setIsCelebrating(true);
      playChime(TAP_MS / 1000);
    }

    setSelectedId(null);
    setJustRestoredId(id);
    void pledge(id, note); // starts the request; the tile is coloured immediately
  }

  function handleDemo(action: "reset" | "skip-to-finale") {
    setJustRestoredId(null);
    setIsCelebrating(false);
    void runDemo(action);
  }

  // Square murals sit beside the text; wide ones get the full width below it.
  const isWide = mural.gridCols > mural.gridRows;

  return (
    <div
      className={
        isWide
          ? "flex flex-col gap-12"
          : "grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16"
      }
    >
      <header className="flex flex-col gap-6">
        {children}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p>
              <span className="font-display text-title text-ink-strong tabular-nums">
                {restored}
              </span>{" "}
              <span className="text-ink-muted">of {total} tiles restored</span>
            </p>
            <p className="flex items-center gap-2 font-mono text-label uppercase text-ink-muted">
              <span aria-hidden="true" className="live-dot" data-live={isLive || undefined} />
              {isLive ? "Live" : "Reconnecting…"}
            </p>
          </div>
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

        <KindnessTicker pledges={pledges} />

        {error && (
          <p role="alert" className="rounded-panel bg-surface-raised p-4 text-sm text-danger">
            {error}
          </p>
        )}

        {canRunDemo && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => handleDemo("skip-to-finale")}
              className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
            >
              Skip to final tile
            </button>
            <button
              type="button"
              onClick={() => handleDemo("reset")}
              className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
            >
              Reset demo
            </button>
          </div>
        )}
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
        organisation={mural.organisation}
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
