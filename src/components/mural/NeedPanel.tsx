"use client";

import { useEffect, useRef } from "react";
import { VerifiedBadge } from "@/components/murals/VerifiedBadge";
import type { MuralTile, Organisation } from "@/lib/types";

type NeedPanelProps = {
  tile: MuralTile | null; // null means the panel is closed
  organisation: Organisation; // who asked for every need on this mural
  onClose: () => void;
  onPledge: (id: number) => void;
};

// A side panel built on the native <dialog> element. showModal() gives us,
// for free: focus moves inside, Tab stays inside, Esc closes it, the page
// behind becomes inert, and focus returns to the tile when it closes.
export function NeedPanel({ tile, organisation, onClose, onPledge }: NeedPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // React state says whether the panel should be open; this effect makes
  // the real <dialog> element match it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tile && !dialog.open) dialog.showModal();
    if (!tile && dialog.open) dialog.close();
  }, [tile]);

  return (
    <dialog
      ref={dialogRef}
      className="need-panel"
      aria-labelledby="need-title"
      onClose={onClose}
      // A click on the dimmed backdrop lands on the <dialog> itself.
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      {tile && (
        <div className="flex h-full flex-col gap-8 p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="font-mono text-label uppercase text-ink-muted">
              Tile {tile.id} · ${tile.need.amount}
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-m-2 rounded-pill p-2 text-ink-muted transition-colors duration-300 hover:text-ink"
            >
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <h2 id="need-title" className="font-display text-title text-ink-strong text-balance">
              {tile.need.title}
            </h2>
            <p className="text-ink-muted">{tile.need.detail}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              Requested by <span className="text-ink">{organisation.name}</span>
              {organisation.isVerified && <VerifiedBadge />}
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            {tile.status === "locked" ? (
              <>
                <button
                  type="button"
                  onClick={() => onPledge(tile.id)}
                  className="rounded-pill bg-accent px-6 py-4 font-semibold text-accent-ink transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow active:bg-accent-pressed"
                >
                  Pledge ${tile.need.amount}
                </button>
                <p className="text-center text-sm text-ink-muted">
                  Demo only. No real payment is taken.
                </p>
              </>
            ) : (
              <p className="rounded-panel bg-surface-raised p-5 text-ink">
                A neighbour already met this need. This part of the wall is back in colour.
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
