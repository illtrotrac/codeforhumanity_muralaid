import { EventEmitter } from "node:events";
import type { MuralEvent } from "@/lib/types";

// An in-memory message bus: API routes publish what changed, and every open
// live stream for that mural hears about it.
//
// Limit: this only reaches browsers connected to THIS server process. Run
// two servers behind a load balancer and a pledge on one is invisible to the
// other. In the cloud this becomes a shared pub/sub service (e.g. Redis or
// Postgres LISTEN/NOTIFY). Same publish/subscribe shape, different wiring.

// Kept on globalThis for the same reason as the database connection: the
// dev server re-runs modules on save, and we need ONE bus, not one per save.
const globalForEvents = globalThis as unknown as { muralEvents?: EventEmitter };

const bus = (globalForEvents.muralEvents ??= new EventEmitter());
bus.setMaxListeners(0); // one listener per open browser tab; no fixed cap

export function publish(event: MuralEvent) {
  bus.emit(event.slug, event);
}

// Returns an "unsubscribe" function. Forgetting to call it is a memory leak:
// the bus would keep sending to browsers that left long ago.
export function subscribe(slug: string, listener: (event: MuralEvent) => void): () => void {
  bus.on(slug, listener);
  return () => bus.off(slug, listener);
}
