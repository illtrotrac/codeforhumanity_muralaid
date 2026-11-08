import { recordPaidSession } from "@/server/checkout-flow";
import { getStripe } from "@/server/payments";

// GET /api/checkout/complete?session_id=cs_test_...
// Stripe sends the donor here after paying. We never trust the URL alone:
// we ask Stripe directly whether this session was paid, then send the donor
// back to the mural to watch their region colour in.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = (path: string) => Response.redirect(new URL(path, url.origin), 303);

  const stripe = getStripe();
  const sessionId = url.searchParams.get("session_id");
  if (!stripe || !sessionId) return home("/");

  const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!session) return home("/");

  const outcome = await recordPaidSession(session);
  switch (outcome.status) {
    case "coloured":
    case "already-recorded":
      return home(`/murals/${outcome.slug}?coloured=${outcome.tile}`);
    case "refunded":
      return home(`/murals/${outcome.slug}?payment=refunded`);
    default:
      return home("/");
  }
}
