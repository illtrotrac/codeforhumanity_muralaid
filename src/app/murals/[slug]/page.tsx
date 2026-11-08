import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MuralExperience } from "@/components/mural/MuralExperience";
import { VerifiedBadge } from "@/components/murals/VerifiedBadge";
import { canManage, getCurrentAdmin } from "@/server/auth";
import { getMural, recentPledges } from "@/server/murals";
import { paymentsEnabled } from "@/server/payments";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// /murals/the-long-table, /murals/the-urban-harvest, ...
// After Stripe: ?coloured=46 (just paid for region 46) or ?payment=cancelled
export default function MuralPage({ params, searchParams }: PageProps<"/murals/[slug]">) {
  return (
    <main className="page-rise mx-auto w-full max-w-6xl flex-1 px-6 py-16 lg:py-24">
      <Suspense fallback={<p className="text-ink-muted">Opening the mural…</p>}>
        <MuralLoader params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Reads the mural from the database at request time, inside Suspense.
async function MuralLoader({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;
  await connection();
  const mural = getMural(slug);
  if (!mural) notFound(); // shows Next's 404 page
  // Demo controls (skip/reset) only show for admins who manage this mural.
  const canRunDemo = canManage(await getCurrentAdmin(), mural.organisation.slug);

  // Only trust ?coloured= for a region that really is funded now.
  const coloured = Number(query.coloured);
  const returnedTileId = mural.tiles.some((t) => t.id === coloured && t.status === "restored")
    ? coloured
    : null;
  const paymentNotice =
    query.payment === "cancelled" || query.payment === "refunded" ? query.payment : null;

  return (
    <MuralExperience
      mural={mural}
      recentPledges={recentPledges(slug)}
      canRunDemo={canRunDemo}
      paymentMode={paymentsEnabled() ? "stripe" : "demo"}
      returnedTileId={returnedTileId}
      paymentNotice={paymentNotice}
    >
      <p className="font-mono text-label uppercase text-ink-muted">
        {mural.organisation.sector} · {mural.location}
      </p>
      <h1 className="font-display text-display text-ink-strong text-balance">{mural.title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-lg text-ink">With {mural.organisation.name}</p>
        {mural.organisation.isVerified && <VerifiedBadge />}
      </div>
      <p className="max-w-[52ch] text-lg text-ink-muted">
        {mural.organisation.tagline} Each tile is one of their real needs. Fund
        one, and that part of the wall gets its colour back.
      </p>
    </MuralExperience>
  );
}
