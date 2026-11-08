"use client";

import { useState, type FormEvent } from "react";
import { DELIVERY_MAX, validateDeliveryNote } from "@/lib/note-validation";
import type { MuralTile } from "@/lib/types";

type DeliveryFormProps = {
  tile: MuralTile; // a funded section
  onSave: (id: number, note: string) => Promise<string | null>; // resolves to an error, if any
};

// Fixed time zone, so the server's HTML and the browser's render agree.
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// Proof of delivery: tell donors their money became the real thing.
export function DeliveryForm({ tile, onSave }: DeliveryFormProps) {
  const [note, setNote] = useState(tile.delivery?.note ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateDeliveryNote(note);
    if (!checked.ok) return setError(checked.error);

    setError("");
    setIsSaving(true);
    const problem = await onSave(tile.id, checked.note);
    setIsSaving(false);
    if (problem) return setError(problem);
    setSaved("Saved. Donors can see this update now.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="delivery-title"
      className="flex flex-col gap-4 rounded-panel bg-surface p-8 shadow-soft"
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-label uppercase text-ink-muted">Proof of delivery</p>
        <h2 id="delivery-title" className="font-display text-title text-ink-strong">
          {tile.delivery ? "Delivered" : "Mark as delivered"}
        </h2>
        {tile.delivery && (
          <p className="text-sm text-ink-muted">
            Delivered on {dateFormat.format(new Date(tile.delivery.at))}. You can still edit the update.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="delivery-note" className="font-mono text-label uppercase text-ink-muted">
          Update for donors
        </label>
        <textarea
          id="delivery-note"
          rows={3}
          maxLength={DELIVERY_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="The coat was handed over on Tuesday. Thank you!"
          aria-invalid={error ? true : undefined}
          aria-describedby="delivery-count delivery-error"
          className="field resize-none"
        />
        <div className="flex justify-between gap-4 text-sm">
          <p id="delivery-error" role="alert" className="text-danger">{error}</p>
          <p id="delivery-count" className="shrink-0 text-ink-muted tabular-nums">
            {DELIVERY_MAX - note.length} left
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-pill bg-accent px-6 py-3.5 font-semibold text-accent-ink transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
        >
          {isSaving ? "Saving…" : tile.delivery ? "Update" : "Mark delivered"}
        </button>
        <p aria-live="polite" className="text-sm text-ink-muted">{saved}</p>
      </div>
    </form>
  );
}
