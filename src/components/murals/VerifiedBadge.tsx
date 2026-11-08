// Marks an organisation we've checked (in the demo, all of them). On real
// platforms like GlobalGiving this badge means the partner was vetted.
export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-surface-raised px-2.5 py-1 font-mono text-label uppercase text-ink">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 fill-accent">
        <path d="M8 0l2 2.2 3-.4.4 3L16 8l-2.6 3.2-.4 3-3-.4L8 16l-2-2.2-3 .4-.4-3L0 8l2.6-3.2.4-3 3 .4z" />
        <path d="M7 10.6L4.7 8.3l1-1L7 8.6l3.3-3.3 1 1z" className="fill-accent-ink" />
      </svg>
      Verified partner
    </span>
  );
}
