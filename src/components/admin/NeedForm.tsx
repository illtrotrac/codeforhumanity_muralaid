"use client";

import { useState, type FormEvent } from "react";
import type { SaveNeedResult } from "@/components/mural/useMuralState";
import type { MuralTile, Need } from "@/lib/types";
import {
  AMOUNT_MAX,
  AMOUNT_MIN,
  validateNeed,
  type NeedErrors,
  type NeedField,
} from "@/lib/need-validation";

type NeedFormProps = {
  tile: MuralTile;
  onSave: (id: number, need: Need) => Promise<SaveNeedResult>;
};

// The inputs are "uncontrolled": the browser keeps what's typed, and we
// read it all at once with FormData when the form is submitted.
export function NeedForm({ tile, onSave }: NeedFormProps) {
  const [errors, setErrors] = useState<NeedErrors>({});
  const [savedMessage, setSavedMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isFunded = tile.status === "restored";

  // Every input gets the same accessibility wiring: a stable id for its
  // <label>, and a link to its error message when there is one.
  function fieldProps(name: NeedField) {
    return {
      id: `need-${name}`,
      name,
      disabled: isFunded,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? `need-${name}-error` : undefined,
    };
  }

  function showErrors(next: NeedErrors) {
    setErrors(next);
    setSavedMessage("");
    // Put the cursor in the first field that needs fixing.
    const firstBad = Object.keys(next)[0];
    if (firstBad) document.getElementById(`need-${firstBad}`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser reloading the page
    const data = new FormData(event.currentTarget);

    // 1. Check in the browser first: instant feedback, no network trip.
    const result = validateNeed({
      title: data.get("title"),
      detail: data.get("detail"),
      amount: data.get("amount"),
    });
    if (!result.ok) return showErrors(result.errors);

    // 2. Send it to the server, which checks again and saves.
    setErrors({});
    setFormError("");
    setIsSaving(true);
    const saved = await onSave(tile.id, result.need);
    setIsSaving(false);

    if (!saved.ok) {
      setFormError(saved.message);
      if (saved.errors) showErrors(saved.errors);
      return;
    }
    setSavedMessage(`Saved. Tile ${tile.id} now asks for $${result.need.amount}.`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate // we show our own error messages instead of the browser's
      aria-labelledby="need-form-title"
      className="flex flex-col gap-6 rounded-panel bg-surface p-8 shadow-soft"
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-label uppercase text-ink-muted">
          Tile {tile.id} · row {tile.row + 1}, column {tile.col + 1}
        </p>
        <h2 id="need-form-title" className="font-display text-title text-ink-strong">
          {isFunded ? "Funded" : "Edit this need"}
        </h2>
        {isFunded && (
          <p className="text-ink-muted">
            A neighbour already funded this tile, so its need can&apos;t change.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="need-title" className="font-mono text-label uppercase text-ink-muted">
          What&apos;s needed
        </label>
        <input {...fieldProps("title")} type="text" defaultValue={tile.need.title} className="field" />
        <FieldError name="title" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="need-detail" className="font-mono text-label uppercase text-ink-muted">
          Why it matters
        </label>
        <textarea {...fieldProps("detail")} rows={3} defaultValue={tile.need.detail} className="field resize-none" />
        <FieldError name="detail" errors={errors} />
      </div>

      <div className="flex max-w-[10rem] flex-col gap-2">
        <label htmlFor="need-amount" className="font-mono text-label uppercase text-ink-muted">
          Amount
        </label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted">
            $
          </span>
          <input
            {...fieldProps("amount")}
            type="number"
            inputMode="numeric"
            min={AMOUNT_MIN}
            max={AMOUNT_MAX}
            step={1}
            defaultValue={tile.need.amount}
            className="field pl-8 tabular-nums"
          />
        </div>
        <FieldError name="amount" errors={errors} />
      </div>

      {!isFunded && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-pill bg-accent px-6 py-3.5 font-semibold text-accent-ink transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow active:bg-accent-pressed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
          >
            {isSaving ? "Saving…" : "Save need"}
          </button>
          <p aria-live="polite" className="text-sm text-ink-muted">
            {savedMessage}
          </p>
        </div>
      )}

      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
    </form>
  );
}

function FieldError({ name, errors }: { name: NeedField; errors: NeedErrors }) {
  if (!errors[name]) return null;
  return (
    <p id={`need-${name}-error`} className="text-sm text-danger">
      {errors[name]}
    </p>
  );
}
