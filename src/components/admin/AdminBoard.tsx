"use client";

import { useState } from "react";
import { Mural } from "@/components/mural/Mural";
import { useMural } from "@/components/mural/MuralStore";
import { NeedForm } from "./NeedForm";

// The shelter's view: pick a tile on the mural, then edit what it asks for.
export function AdminBoard() {
  const { mural, tiles, updateNeed } = useMural();
  const [selectedId, setSelectedId] = useState<number>(mural.finaleTileId);

  const selectedTile = tiles.find((t) => t.id === selectedId) ?? null;
  const locked = tiles.filter((t) => t.status === "locked");
  const stillNeeded = locked.reduce((sum, t) => sum + t.need.amount, 0);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <p className="font-mono text-label uppercase text-ink-muted">
          Shelter admin · demo mode, no sign-in
        </p>
        <h1 className="font-display text-title text-ink-strong">Map needs to tiles</h1>
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-sm text-ink-muted">Tiles waiting</dt>
            <dd className="font-display text-title text-ink-strong tabular-nums">{locked.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Tiles funded</dt>
            <dd className="font-display text-title text-ink-strong tabular-nums">
              {tiles.length - locked.length}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Still needed</dt>
            <dd className="font-display text-title text-accent tabular-nums">
              ${stillNeeded.toLocaleString("en-US")}
            </dd>
          </div>
        </dl>
      </header>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Mural
          mural={mural}
          tiles={tiles}
          justRestoredId={null}
          isComplete={false}
          isCelebrating={false}
          selectedId={selectedId}
          onSelectTile={setSelectedId}
        />

        {selectedTile && (
          // key: switching tiles gives a fresh form with that tile's values.
          <NeedForm key={selectedTile.id} tile={selectedTile} onSave={updateNeed} />
        )}
      </div>
    </div>
  );
}
