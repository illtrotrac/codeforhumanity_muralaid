import Stripe from "stripe";

// Stripe, if configured. With no key, the app runs in demo mode: pledges
// are instant and free. That keeps the pitch working on venue wifi.

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Refuse live keys outright: this project only ever takes test payments.
  if (!key.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a TEST key (sk_test_...). Live payments are not supported.");
  }
  stripe ??= new Stripe(key);
  return stripe;
}

export function paymentsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// How long a tile is held while its donor is on Stripe's page. Stripe's
// minimum session lifetime is 30 minutes, so the hold matches it.
export const CHECKOUT_MINUTES = 30;

// What we tuck into the Stripe session so we know what it was for when it
// comes back. Stripe metadata values are strings (max 500 chars each).
export type CheckoutMetadata = {
  slug: string;
  tile: string;
  donorName: string;
  message: string;
};
