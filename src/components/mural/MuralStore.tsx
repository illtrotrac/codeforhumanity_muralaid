"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Mural, MuralTile, Need } from "@/data/sample-mural";

// Shared mural state for every page. The provider sits in the root layout,
// so moving between "/" and "/admin" keeps the same tiles.
//
// It lives in the browser's memory, so a page refresh resets it. Step 4
// moves it into a database on the server.

type MuralStore = {
  mural: Mural;
  tiles: MuralTile[];
  pledge: (id: number) => void;
  updateNeed: (id: number, need: Need) => void;
  skipToFinale: () => void;
  reset: () => void;
};

const MuralContext = createContext<MuralStore | null>(null);

type MuralProviderProps = {
  initialMural: Mural;
  children: ReactNode;
};

export function MuralProvider({ initialMural, children }: MuralProviderProps) {
  const [tiles, setTiles] = useState(initialMural.tiles);

  // Each action builds a new array instead of changing the old one.
  const store: MuralStore = {
    mural: initialMural,
    tiles,
    pledge: (id) =>
      setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, status: "restored" } : t))),
    updateNeed: (id, need) =>
      setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, need } : t))),
    // Demo helper: restore everything except the finale tile, so one live
    // pledge on stage completes the mural.
    skipToFinale: () =>
      setTiles((prev) =>
        prev.map((t) => ({
          ...t,
          status: t.id === initialMural.finaleTileId ? "locked" : "restored",
        })),
      ),
    reset: () => setTiles(initialMural.tiles),
  };

  return <MuralContext.Provider value={store}>{children}</MuralContext.Provider>;
}

// Any client component inside the provider can call useMural() to read the
// tiles or change them.
export function useMural(): MuralStore {
  const store = useContext(MuralContext);
  if (!store) throw new Error("useMural must be used inside <MuralProvider>");
  return store;
}
