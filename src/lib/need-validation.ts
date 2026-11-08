import type { Need } from "./types";

// The rules for a valid need, kept in one plain function with no React.
// The admin form uses it now; in step 4 the server runs the same function,
// because anything sent from a browser can be faked.

export type NeedField = "title" | "detail" | "amount";
export type NeedErrors = Partial<Record<NeedField, string>>;

export const AMOUNT_MIN = 1;
export const AMOUNT_MAX = 500;

type NeedInput = Record<NeedField, unknown>;

type ValidationResult = { ok: true; need: Need } | { ok: false; errors: NeedErrors };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function checkLength(value: string, label: string, min: number, max: number) {
  if (value.length < min) return `${label} needs at least ${min} characters.`;
  if (value.length > max) return `${label} can be at most ${max} characters.`;
  return undefined;
}

export function validateNeed(input: NeedInput): ValidationResult {
  const title = text(input.title);
  const detail = text(input.detail);
  const amount = Number(text(input.amount));

  const errors: NeedErrors = {};

  const titleError = checkLength(title, "Title", 3, 60);
  if (titleError) errors.title = titleError;

  const detailError = checkLength(detail, "Description", 10, 160);
  if (detailError) errors.detail = detailError;

  if (!Number.isInteger(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    errors.amount = `Enter a whole dollar amount from $${AMOUNT_MIN} to $${AMOUNT_MAX}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, need: { title, detail, amount } };
}
