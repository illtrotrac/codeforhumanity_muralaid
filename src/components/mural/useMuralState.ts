"use client";

import { useEffect, useRef, useState } from "react";
import { muralApi } from "@/lib/mural-api";
import type { NeedErrors } from "@/lib/need-validation";
import type {
  DemoAction,
  DonorNote,
  Mural,
  MuralEvent,
  MuralTile,
  Need,
  PledgeActivity,
} from "@/lib/types";

export type SaveNeedResult = { ok: true } | { ok: false; message: string; errors?: NeedErrors };

// Optional reactions to things other people do, while this page is open.
export type LiveHandlers = {
  onPledge?: (pledge: PledgeActivity) => void; // any pledge, including our own
  onRemoteComplete?: () => void; // someone ELSE funded the last tile
};

function replaceTile(tiles: MuralTile[], next: MuralTile) {
  return tiles.map((t) => (t.id === next.id ? next : t));
}

// One mural's tiles in the browser, kept in step with the server: our own
// changes go out over the API, everyone else's arrive over the live stream.
export function useMuralState(initial: Mural, live: LiveHandlers = {}) {
  const [tiles, setTiles] = useState(initial.tiles);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const { slug } = initial;

  // The stream's listeners are created once, so they read the latest tiles
  // and handlers through refs instead of capturing stale copies.
  const tilesRef = useRef(tiles);
  const liveRef = useRef(live);
  useEffect(() => {
    tilesRef.current = tiles;
    liveRef.current = live;
  });

  useEffect(() => {
    const source = new EventSource(`/api/murals/${encodeURIComponent(slug)}/events`);
    let droppedConnection = false;

    function read(event: Event) {
      return JSON.parse((event as MessageEvent<string>).data) as MuralEvent;
    }

    source.addEventListener("tile-restored", (event) => {
      const data = read(event);
      if (data.type !== "tile-restored") return;
      // If the tile was already in colour here, this is our own optimistic
      // pledge coming back, so it doesn't count as someone else finishing.
      const wasLocked = tilesRef.current.find((t) => t.id === data.tile.id)?.status === "locked";
      setTiles((prev) => replaceTile(prev, data.tile));
      liveRef.current.onPledge?.(data.pledge);
      if (wasLocked && data.completed) liveRef.current.onRemoteComplete?.();
    });

    source.addEventListener("tile-updated", (event) => {
      const data = read(event);
      if (data.type === "tile-updated") setTiles((prev) => replaceTile(prev, data.tile));
    });

    source.addEventListener("mural-replaced", (event) => {
      const data = read(event);
      if (data.type === "mural-replaced") setTiles(data.tiles);
    });

    source.onopen = () => {
      setIsLive(true);
      // Anything could have changed while we were disconnected, and those
      // events are gone. Catch up by fetching the whole mural once.
      if (droppedConnection) {
        droppedConnection = false;
        void muralApi.get(slug).then((result) => {
          if (result.ok) setTiles(result.data.tiles);
        });
      }
    };

    // EventSource reconnects by itself; we just show that we're offline.
    source.onerror = () => {
      droppedConnection = true;
      setIsLive(false);
    };

    return () => source.close(); // leaving the page closes the stream
  }, [slug]);

  // Optimistic update: colour the tile (and show the note) straight away,
  // then tell the server. If the server says no, put it back and explain.
  async function pledge(id: number, note: DonorNote) {
    setError(null);
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, status: "restored", note } : t)));
    const result = await muralApi.pledge(slug, id, note);
    if (result.ok) return;
    if (result.status === 409) return; // someone else funded it first; it's in colour either way
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, status: "locked", note: null } : t)));
    setError(`Your pledge didn't go through: ${result.error}`);
  }

  // Paid pledges: get a Stripe payment page and go there. The tile is NOT
  // coloured here; that happens only once the server confirms payment.
  // Returns an error message to show, or nothing if we're leaving the page.
  async function checkout(id: number, note: DonorNote): Promise<string | null> {
    const result = await muralApi.checkout(slug, id, note);
    if (!result.ok) return result.error;
    window.location.assign(result.data.url);
    return null;
  }

  async function saveNeed(id: number, need: Need): Promise<SaveNeedResult> {
    const result = await muralApi.saveNeed(slug, id, need);
    if (!result.ok) return { ok: false, message: result.error, errors: result.errors };
    setTiles((prev) => replaceTile(prev, result.data.tile));
    return { ok: true };
  }

  // Returns an error message, or null when saved.
  async function markDelivered(id: number, note: string): Promise<string | null> {
    const result = await muralApi.markDelivered(slug, id, note);
    if (!result.ok) return result.error;
    setTiles((prev) => replaceTile(prev, result.data.tile));
    return null;
  }

  async function runDemo(action: DemoAction) {
    setError(null);
    const result = await muralApi.demo(slug, action);
    if (result.ok) setTiles(result.data.tiles);
    else setError(result.error);
  }

  return { mural: initial, tiles, error, isLive, pledge, checkout, saveNeed, markDelivered, runDemo };
}
