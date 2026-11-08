import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { VerifiedBadge } from "@/components/murals/VerifiedBadge";
import { listPartners } from "@/server/murals";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Every partner organisation, with what donors have achieved together.
export async function PartnerList() {
  await connection(); // live totals: render per request, never pre-build
  const partners = listPartners();

  return (
    <ul className="flex flex-col gap-8">
      {partners.map((partner) => (
        // id: so a colouring page can link straight to its partner (/partners#slug)
        <li key={partner.slug} id={partner.slug} className="scroll-mt-24">
          <article
            aria-labelledby={`${partner.slug}-name`}
            className="grid gap-8 rounded-panel bg-surface p-8 shadow-soft md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="font-mono text-label uppercase text-ink-muted">{partner.sector}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id={`${partner.slug}-name`} className="font-display text-title text-ink-strong">
                    {partner.name}
                  </h2>
                  {partner.isVerified && <VerifiedBadge />}
                </div>
                <p className="max-w-[52ch] text-ink-muted">{partner.tagline}</p>
              </div>

              <dl className="flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <dt className="text-sm text-ink-muted">Raised</dt>
                  <dd className="stat-number text-accent">{money.format(partner.raised)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-muted">Sections coloured in</dt>
                  <dd className="stat-number text-ink-strong">{partner.fundedCount}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-muted">Delivered</dt>
                  <dd className="flex items-center gap-2 stat-number text-ink-strong">
                    {partner.deliveredCount}
                    {partner.deliveredCount > 0 && (
                      <span aria-hidden="true" className="delivered-seal scale-75">✓</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-label uppercase text-ink-muted">
                {partner.pages.length === 1 ? "Their colouring page" : "Their colouring pages"}
              </h3>
              <ul className="flex flex-col gap-3">
                {partner.pages.map((page) => {
                  const progress = page.totalTiles ? page.restoredTiles / page.totalTiles : 0;
                  return (
                    <li key={page.slug}>
                      <Link
                        href={`/murals/${page.slug}`}
                        className="group flex items-center gap-4 rounded-panel p-2 transition-colors duration-300 ease-out-soft hover:bg-surface-raised"
                      >
                        <Image
                          src={page.imageSrc}
                          alt=""
                          width={96}
                          height={96}
                          className="size-20 shrink-0 rounded-tile object-cover shadow-soft"
                          // Like the storybook cards: more funded = more colour
                          style={{ filter: `grayscale(${(1 - progress).toFixed(2)})` }}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="font-display text-xl text-ink-strong group-hover:text-accent">
                            {page.title}
                          </span>
                          <div className="h-1 overflow-hidden rounded-pill bg-surface-raised">
                            <div className="h-full rounded-pill bg-accent" style={{ width: `${progress * 100}%` }} />
                          </div>
                          <span className="text-sm text-ink-muted">
                            {page.restoredTiles} of {page.totalTiles} sections coloured in
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
