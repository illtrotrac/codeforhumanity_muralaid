import type Stripe from "stripe";
import { recordPaidSession } from "@/server/checkout-flow";
import { releaseReservation } from "@/server/murals";
import { getStripe } from "@/server/payments";

// POST /api/stripe/webhook - Stripe calls this directly, server to server.
//
// Why both this AND the redirect? A donor might pay and then close the tab
// before being redirected. The webhook still arrives, so the pledge is
// never lost. (Locally, forward webhooks with the Stripe CLI:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook )
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Webhooks are not configured.", { status: 503 });

  // Verify the signature on the RAW body: proof the call came from Stripe,
  // not from someone pretending to be Stripe to get free tiles.
  const signature = request.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await recordPaidSession(event.data.object);
  } else if (event.type === "checkout.session.expired") {
    const { metadata, id } = event.data.object;
    const tile = Number(metadata?.tile);
    if (metadata?.slug && Number.isInteger(tile)) releaseReservation(metadata.slug, tile, id);
  }

  // Always answer 200 quickly once verified; Stripe retries anything else.
  return new Response("ok");
}
