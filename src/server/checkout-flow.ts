import type Stripe from "stripe";
import { validateNote } from "@/lib/note-validation";
import { publish } from "./events";
import { completeCheckout } from "./murals";
import { getStripe, type CheckoutMetadata } from "./payments";

export type RecordOutcome =
  | { status: "coloured"; slug: string; tile: number } // new pledge recorded
  | { status: "already-recorded"; slug: string; tile: number } // seen this session before
  | { status: "refunded"; slug: string; tile: number } // paid, but the tile was taken: money returned
  | { status: "unpaid" }
  | { status: "invalid" };

// Turn a Stripe checkout session into a pledge, if (and only if) Stripe
// says it was paid. Used by the return redirect AND the webhook; whichever
// arrives second finds the pledge already recorded and changes nothing.
export async function recordPaidSession(session: Stripe.Checkout.Session): Promise<RecordOutcome> {
  if (session.payment_status !== "paid") return { status: "unpaid" };

  const meta = (session.metadata ?? {}) as Partial<CheckoutMetadata>;
  const tile = Number(meta.tile);
  if (!meta.slug || !Number.isInteger(tile)) return { status: "invalid" };

  // Re-check the note: metadata came back from outside our server.
  const checked = validateNote({ donorName: meta.donorName, message: meta.message });
  const note = checked.ok ? checked.note : { donorName: null, message: null };
  const amountPaid = (session.amount_total ?? 0) / 100; // Stripe counts in cents

  const result = completeCheckout(meta.slug, tile, session.id, amountPaid, note);

  if (result.ok && result.alreadyRecorded) return { status: "already-recorded", slug: meta.slug, tile };
  if (result.ok) {
    const { tile: restored, completed, pledge } = result;
    publish({ type: "tile-restored", slug: meta.slug, tile: restored, completed, pledge });
    return { status: "coloured", slug: meta.slug, tile };
  }

  // Paid, but the tile can't take it (e.g. its hold expired and someone
  // else funded it). Never keep money we can't turn into the thing promised.
  if (typeof session.payment_intent === "string") {
    await getStripe()?.refunds.create({ payment_intent: session.payment_intent });
  }
  console.warn(`[checkout] refunded session ${session.id}: tile ${meta.slug}#${tile} was ${result.reason}`);
  return { status: "refunded", slug: meta.slug, tile };
}
