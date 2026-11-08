import { connection } from "next/server";
import type { MuralEvent } from "@/lib/types";
import { subscribe } from "@/server/events";
import { jsonError } from "@/server/http";
import { getMural } from "@/server/murals";

const HEARTBEAT_MS = 25_000;

// GET /api/murals/:slug/events - a live stream of changes (Server-Sent Events).
//
// The response never ends: the server keeps the connection open and writes
// a small text message each time something happens. SSE's format is plain
// text, one message per blank-line-separated block:
//
//   event: tile-restored
//   data: {"type":"tile-restored", ...}
//
export async function GET(request: Request, ctx: RouteContext<"/api/murals/[slug]/events">) {
  await connection();
  const { slug } = await ctx.params;
  if (!getMural(slug)) return jsonError("That mural doesn't exist.", 404);

  const encoder = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (text: string) => {
        if (!closed) controller.enqueue(encoder.encode(text));
      };

      send("retry: 3000\n\n"); // if the connection drops, browsers retry after 3s
      send(": connected\n\n"); // lines starting with ":" are comments, ignored by browsers

      const unsubscribe = subscribe(slug, (event: MuralEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      // Proxies and load balancers often cut connections that look idle.
      // A tiny comment every 25s keeps this one alive.
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe(); // without this, every closed tab would leak a listener
        controller.close();
      };
      // The browser tab closed or navigated away.
      request.signal.addEventListener("abort", stop);
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform", // never cache or compress a live stream
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // tells nginx-style proxies not to hold messages back
    },
  });
}
