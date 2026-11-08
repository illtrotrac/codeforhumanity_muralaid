import type { Metadata } from "next";
import { Suspense } from "react";
import { PartnerList } from "@/components/partners/PartnerList";

export const metadata: Metadata = {
  title: "Our partners",
};

export default function PartnersPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:py-16">
      <header className="mx-auto flex max-w-[48ch] flex-col items-center gap-2 text-center">
        <p className="font-mono text-label uppercase text-ink-muted">Our partners</p>
        <h1 className="font-display text-title text-ink-strong text-balance">
          The organisations behind every page
        </h1>
        <p className="text-ink-muted">
          Each colouring page belongs to one local organisation. Every section
          is one of their real needs, and every delivery is confirmed by them.
        </p>
      </header>
      <Suspense fallback={<p className="text-center text-ink-muted">Gathering our partners…</p>}>
        <PartnerList />
      </Suspense>
      <p className="text-center text-sm text-ink-muted">
        All organisations shown are fictional, for this demo.
      </p>
    </main>
  );
}
