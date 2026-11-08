"use client";

import { useState, type ReactNode } from "react";
import { MuralMagic, TAP_MS } from "@/components/magic/MuralMagic";
import { playChime } from "@/lib/chime";
import type { DonorNote, Mural as MuralData, PledgeActivity } from "@/lib/types";
import { KindnessTicker } from "./KindnessTicker";
import { Mural } from "./Mural";
import { NeedPanel, type PaymentMode } from "./NeedPanel";
import { useMuralState } from "./useMuralState";

const TICKER_LENGTH = 5;

const PAYMENT_NOTICES = {
  cancelled: "Payment cancelled. Nothing was charged, and the section is free again.",
  refunded: "Someone funded that section just before you, so we've refunded your payment in full.",
} as const;

type MuralExperienceProps = {
  mural: MuralData; // loaded from the database by the page, on the server
  recentPledges: PledgeActivity[]; // newest first
  canRunDemo: boolean; // show the rehearsal controls (signed-in admins only)
  paymentMode: PaymentMode;
  returnedTileId: number | null; // just paid on Stripe: colour this region in on arrival
  paymentNotice: keyof typeof PAYMENT_NOTICES | null;
  children: ReactNode; // the static intro, rendered on the server
};

// The interactive part of a mural page. Tile data, saving and the live
// stream live in useMuralState; this component keeps UI state (which panel
// is open, whether the celebration is playing, the ticker).
export function MuralExperience({
  mural: initialMural,
  recentPledges,
  canRunDemo,
  paymentMode,
  returnedTileId,
  paymentNotice,
  children,
}: MuralExperienceProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Back from Stripe? Play the crayon animation on the region just paid for,
  // and the celebration if that payment finished the wall. (No chime: the
  // browser only allows sound right after a click on this page.)
  const [justRestoredId, setJustRestoredId] = useState<number | null>(returnedTileId);
  const [isCelebrating, setIsCelebrating] = useState(
    () => returnedTileId !== null && initialMural.tiles.every((t) => t.status === "restored"),
  );
  const [pledges, setPledges] = useState(recentPledges);

  const { mural, tiles, error, isLive, pledge, checkout, runDemo } = useMuralState(initialMural, {
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

  // Replay is a click, so the chime is allowed to play this time.
  function handleReplay() {
    setIsCelebrating(false);
    // Next frame: remounting the celebration restarts all its animations.
    requestAnimationFrame(() => {
      setIsCelebrating(true);
      playChime(TAP_MS / 1000);
    });
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
              <span className="text-ink-muted">of {total} sections coloured in</span>
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
          // A finished page shouldn't be a dead end: let people relive the
          // moment, and let admins start the page over.
          <section
            aria-labelledby="complete-title"
            className="flex flex-col gap-3 rounded-panel bg-surface p-5 shadow-soft"
          >
            <h2 id="complete-title" className="font-display text-title text-accent">
              Every section is coloured in!
            </h2>
            <p className="text-ink-muted">
              Thank you to everyone who helped {mural.organisation.name} finish this page.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReplay}
                className="rounded-pill bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow"
              >
                Replay the celebration
              </button>
              {canRunDemo && (
                <button
                  type="button"
                  onClick={() => handleDemo("reset")}
                  className="rounded-pill px-5 py-2.5 font-semibold text-ink ring-1 ring-line-strong transition-all duration-300 ease-out-soft hover:ring-ink"
                >
                  Reset this page
                </button>
              )}
            </div>
          </section>
        )}

        <KindnessTicker pledges={pledges} />

        {paymentNotice && (
          <p role="status" className="rounded-panel bg-surface-raised p-4 text-sm text-ink">
            {PAYMENT_NOTICES[paymentNotice]}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-panel bg-surface-raised p-4 text-sm text-danger">
            {error}
          </p>
        )}

        {canRunDemo && !isComplete && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => handleDemo("skip-to-finale")}
              className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
            >
              Skip to the last section
            </button>
            <button
              type="button"
              onClick={() => handleDemo("reset")}
              className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
            >
              Reset this page
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
        paymentMode={paymentMode}
        canDemoPledge={canRunDemo}
        onClose={() => setSelectedId(null)}
        onPledge={handlePledge}
        onCheckout={checkout}
      />

      {/* Screen readers announce changes to this region out loud. */}
      <p aria-live="polite" className="sr-only">
        {isComplete && justRestoredId !== null
          ? "Page complete! Every section is coloured in."
          : justRestoredId !== null &&
            `Section ${justRestoredId} coloured in. ${restored} of ${total} sections done.`}
      </p>
    </div>
  );
}
