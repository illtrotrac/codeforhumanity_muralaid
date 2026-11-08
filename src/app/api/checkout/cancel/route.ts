import { releaseReservation } from "@/server/murals";
import { getStripe } from "@/server/payments";

// GET /api/checkout/cancel?session_id=cs_test_...
// The donor clicked "back" on Stripe's page. Close the session so it can't
// be paid later, free the tile for someone else, and return to the mural.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const stripe = getStripe();
  const sessionId = url.searchParams.get("session_id");
  if (!stripe || !sessionId) return Response.redirect(new URL("/", url.origin), 303);

  const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  const slug = session?.metadata?.slug;
  const tile = Number(session?.metadata?.tile);

  if (session && session.status === "open") {
    await stripe.checkout.sessions.expire(sessionId).catch(() => null);
  }
  if (slug && Number.isInteger(tile)) releaseReservation(slug, tile, sessionId);

  return Response.redirect(new URL(slug ? `/murals/${slug}?payment=cancelled` : "/", url.origin), 303);
}
