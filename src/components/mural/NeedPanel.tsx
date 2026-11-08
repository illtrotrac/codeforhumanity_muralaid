"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { VerifiedBadge } from "@/components/murals/VerifiedBadge";
import { MESSAGE_MAX, NAME_MAX, validateNote, type NoteErrors } from "@/lib/note-validation";
import type { DonorNote, MuralTile, Organisation } from "@/lib/types";

// "stripe": donors pay on Stripe's page. "demo": instant, free pledges.
export type PaymentMode = "stripe" | "demo";

type NeedPanelProps = {
  tile: MuralTile | null; // null means the panel is closed
  organisation: Organisation; // who asked for every need on this mural
  paymentMode: PaymentMode;
  canDemoPledge: boolean; // admins may still pledge for free, for the live pitch
  onClose: () => void;
  onPledge: (id: number, note: DonorNote) => void;
  onCheckout: (id: number, note: DonorNote) => Promise<string | null>; // resolves to an error, if any
};

// A side panel built on the native <dialog> element. showModal() gives us,
// for free: focus moves inside, Tab stays inside, Esc closes it, the page
// behind becomes inert, and focus returns to the tile when it closes.
export function NeedPanel({
  tile,
  organisation,
  paymentMode,
  canDemoPledge,
  onClose,
  onPledge,
  onCheckout,
}: NeedPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // React state says whether the panel should be open; this effect makes
  // the real <dialog> element match it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tile && !dialog.open) dialog.showModal();
    if (!tile && dialog.open) dialog.close();
  }, [tile]);

  return (
    <dialog
      ref={dialogRef}
      className="need-panel"
      aria-labelledby="need-title"
      onClose={onClose}
      // A click on the dimmed backdrop lands on the <dialog> itself.
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      {tile && (
        <div className="flex h-full flex-col gap-8 p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="font-mono text-label uppercase text-ink-muted">
              Section {tile.id} · ${tile.need.amount}
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-m-2 rounded-pill p-2 text-ink-muted transition-colors duration-300 hover:text-ink"
            >
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <h2 id="need-title" className="font-display text-title text-ink-strong text-balance">
              {tile.need.title}
            </h2>
            <p className="text-ink-muted">{tile.need.detail}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              Requested by <span className="text-ink">{organisation.name}</span>
              {organisation.isVerified && <VerifiedBadge />}
            </p>
          </div>

          <div className="mt-auto">
            {tile.status === "locked" ? (
              // key: a fresh, empty form for each tile you open
              <PledgeForm
                key={tile.id}
                tile={tile}
                paymentMode={paymentMode}
                canDemoPledge={canDemoPledge}
                onPledge={onPledge}
                onCheckout={onCheckout}
              />
            ) : (
              <FundedNote note={tile.note} />
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

type PledgeFormProps = Pick<
  NeedPanelProps,
  "paymentMode" | "canDemoPledge" | "onPledge" | "onCheckout"
> & { tile: MuralTile };

function PledgeForm({ tile, paymentMode, canDemoPledge, onPledge, onCheckout }: PledgeFormProps) {
  const [message, setMessage] = useState(""); // kept in state only to drive the counter
  const [errors, setErrors] = useState<NoteErrors>({});
  const [checkoutError, setCheckoutError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  // One form, two buttons. The clicked button arrives as the event's
  // "submitter", so we know which path the donor chose.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const checked = validateNote({ donorName: data.get("donorName"), message: data.get("message") });
    if (!checked.ok) return setErrors(checked.errors);
    setErrors({});

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (paymentMode === "stripe" && submitter?.value !== "demo") {
      setCheckoutError("");
      setIsRedirecting(true);
      const problem = await onCheckout(tile.id, checked.note);
      if (problem) {
        setIsRedirecting(false);
        setCheckoutError(problem);
      }
      return;
    }
    // Submitting from the button click still counts as a click for the
    // browser, so the celebration chime is allowed to play.
    onPledge(tile.id, checked.note);
  }

  const remaining = MESSAGE_MAX - message.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="pledge-name" className="font-mono text-label uppercase text-ink-muted">
          Your name <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="pledge-name"
          name="donorName"
          type="text"
          maxLength={NAME_MAX}
          autoComplete="given-name"
          placeholder="Leave blank to stay anonymous"
          aria-invalid={errors.donorName ? true : undefined}
          aria-describedby={errors.donorName ? "pledge-name-error" : undefined}
          className="field"
        />
        {errors.donorName && (
          <p id="pledge-name-error" className="text-sm text-danger">{errors.donorName}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pledge-message" className="font-mono text-label uppercase text-ink-muted">
          A note for the wall <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="pledge-message"
          name="message"
          rows={2}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Stay warm out there."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby="pledge-message-count pledge-message-error"
          className="field resize-none"
        />
        <div className="flex justify-between gap-4 text-sm">
          <p id="pledge-message-error" className="text-danger">{errors.message}</p>
          <p id="pledge-message-count" className="shrink-0 text-ink-muted tabular-nums">
            {remaining} left
          </p>
        </div>
      </div>

      {checkoutError && (
        <p role="alert" className="text-sm text-danger">
          {checkoutError}
        </p>
      )}

      <button
        type="submit"
        value={paymentMode === "stripe" ? "pay" : "demo"}
        disabled={isRedirecting}
        className="rounded-pill bg-accent px-6 py-4 font-semibold text-accent-ink transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow active:bg-accent-pressed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {paymentMode === "stripe"
          ? isRedirecting
            ? "Opening secure payment…"
            : `Continue to payment · $${tile.need.amount}`
          : `Pledge $${tile.need.amount}`}
      </button>

      {paymentMode === "stripe" && canDemoPledge && (
        <button
          type="submit"
          value="demo"
          className="font-mono text-label uppercase text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline"
        >
          Admin: demo pledge without paying
        </button>
      )}

      <p className="text-center text-sm text-ink-muted">
        {paymentMode === "stripe"
          ? "Test mode: use card 4242 4242 4242 4242. Notes appear publicly on the page."
          : "Demo only. No real payment is taken. Notes appear publicly on the page."}
      </p>
    </form>
  );
}

// What a funded region says about who coloured it in.
function FundedNote({ note }: { note: DonorNote | null }) {
  const who = note?.donorName ?? "A neighbour";
  return (
    <figure className="flex flex-col gap-3 rounded-panel bg-surface-raised p-5">
      {note?.message && (
        <blockquote className="font-display text-xl leading-snug text-ink-strong">
          &ldquo;{note.message}&rdquo;
        </blockquote>
      )}
      <figcaption className="text-sm text-ink-muted">
        <span className="text-ink">{who}</span> coloured this section in.
      </figcaption>
    </figure>
  );
}
