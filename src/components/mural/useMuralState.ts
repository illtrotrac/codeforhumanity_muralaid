"use client";

import { useState } from "react";
import { muralApi } from "@/lib/mural-api";
import type { NeedErrors } from "@/lib/need-validation";
import type { DemoAction, Mural, Need, TileStatus } from "@/lib/types";

export type SaveNeedResult = { ok: true } | { ok: false; message: string; errors?: NeedErrors };

// One mural's tiles in the browser, kept in step with the server.
// The page loads the mural on the server and passes it in as the start.
export function useMuralState(initial: Mural) {
  const [tiles, setTiles] = useState(initial.tiles);
  const [error, setError] = useState<string | null>(null);
  const { slug } = initial;

  function setStatus(id: number, status: TileStatus) {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  // Optimistic update: colour the tile straight away, then tell the server.
  // If the server says no, put it back and explain.
  async function pledge(id: number) {
    setError(null);
    setStatus(id, "restored");
    const result = await muralApi.pledge(slug, id);
    if (result.ok) return;
    if (result.status === 409) return; // someone else funded it first; it's in colour either way
    setStatus(id, "locked");
    setError(`Your pledge didn't go through: ${result.error}`);
  }

  async function saveNeed(id: number, need: Need): Promise<SaveNeedResult> {
    const result = await muralApi.saveNeed(slug, id, need);
    if (!result.ok) return { ok: false, message: result.error, errors: result.errors };
    setTiles((prev) => prev.map((t) => (t.id === id ? result.data.tile : t)));
    return { ok: true };
  }

  async function runDemo(action: DemoAction) {
    setError(null);
    const result = await muralApi.demo(slug, action);
    if (result.ok) setTiles(result.data.tiles);
    else setError(result.error);
  }

  return { mural: initial, tiles, error, pledge, saveNeed, runDemo };
}
