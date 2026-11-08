"use client";

import { useEffect, useState } from "react";
import type { PledgeActivity } from "@/lib/types";

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "just now", "4 minutes ago", "2 hours ago"...
function timeAgo(iso: string, now: number): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (seconds > -45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

type KindnessTickerProps = {
  pledges: PledgeActivity[]; // newest first
};

// The "recent kindness" feed, like GoFundMe's recent donations. Pledges are
// anonymous: we show what was funded, never who funded it.
export function KindnessTicker({ pledges }: KindnessTickerProps) {
  // null until we're running in the browser. The server can't know the
  // viewer's "now", so it leaves the times blank and the browser fills them
  // in; that way the server's HTML and the first browser render match.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 30_000);
    const first = setTimeout(update, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, []);

  return (
    <section aria-labelledby="kindness-title" className="flex flex-col gap-3">
      <h2 id="kindness-title" className="font-mono text-label uppercase text-ink-muted">
        Recent kindness
      </h2>
      {pledges.length === 0 ? (
        <p className="text-sm text-ink-muted">No pledges yet. Yours could be the first.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {pledges.map((p) => (
            <li
              key={`${p.tileId}-${p.at}`}
              className="kindness-item flex items-baseline justify-between gap-4 text-sm"
            >
              <span className="min-w-0 text-ink">
                Someone funded <span className="text-ink-strong">{p.title.toLowerCase()}</span>
                <span className="text-ink-muted"> · ${p.amount}</span>
              </span>
              <time dateTime={p.at} className="shrink-0 text-ink-muted tabular-nums">
                {now === null ? "" : timeAgo(p.at, now)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
