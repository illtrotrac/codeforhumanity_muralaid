import { validateNote } from "@/lib/note-validation";
import { jsonError, parseTileNumber, readJson } from "@/server/http";
import { attachSession, releaseReservation, reserveTile } from "@/server/murals";
import { CHECKOUT_MINUTES, getStripe, type CheckoutMetadata } from "@/server/payments";

// POST /api/murals/:slug/tiles/:tile/checkout - start paying for a tile.
// Body: { donorName?, message? }. Returns { url } of Stripe's payment page.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/murals/[slug]/tiles/[tile]/checkout">,
) {
  const stripe = getStripe();
  if (!stripe) return jsonError("Payments aren't set up; use a demo pledge.", 503);

  const { slug, tile } = await ctx.params;
  const tileNumber = parseTileNumber(tile);
  if (tileNumber === null) return jsonError("Tile must be a positive whole number.", 400);

  const body = ((await readJson(request)) ?? {}) as { donorName?: unknown; message?: unknown };
  const checked = validateNote(body);
  if (!checked.ok) return jsonError("Your note needs a small fix.", 400, { errors: checked.errors });

  // 1. Hold the tile, so nobody else can pay for it while this donor does.
  const hold = reserveTile(slug, tileNumber, CHECKOUT_MINUTES);
  if (!hold.ok) {
    if (hold.reason === "not_found") return jsonError("That mural or tile doesn't exist.", 404);
    if (hold.reason === "already_funded") return jsonError("Someone already funded this section.", 409);
    return jsonError("Someone is paying for this section right now. Try another, or check back soon.", 409);
  }

  // 2. Ask Stripe for a payment page. Where to send the donor afterwards is
  //    built from this request's own address (localhost now, the real
  //    domain once deployed).
  const origin = new URL(request.url).origin;
  const metadata: CheckoutMetadata = {
    slug,
    tile: String(tileNumber),
    donorName: checked.note.donorName ?? "",
    message: checked.note.message ?? "",
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: hold.need.amount * 100, // Stripe counts in cents
            product_data: { name: hold.need.title, description: `${hold.muralTitle}: ${hold.need.detail}` },
          },
        },
      ],
      metadata,
      expires_at: Math.floor(new Date(hold.until).getTime() / 1000), // ends with the hold
      success_url: `${origin}/api/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/api/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
    });
    attachSession(slug, tileNumber, session.id);
    return Response.json({ url: session.url });
  } catch (error) {
    // Stripe is down or rejected us: free the tile, report a gateway error.
    releaseReservation(slug, tileNumber, null);
    console.error("[checkout] could not create a Stripe session", error);
    return jsonError("Payments are unavailable right now. Please try again shortly.", 502);
  }
}
