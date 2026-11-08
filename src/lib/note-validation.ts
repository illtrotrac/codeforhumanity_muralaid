import type { DonorNote } from "./types";

// Rules for the name and note a donor can leave. Used by the pledge panel
// for instant feedback, and by the server, which has the final say.

export const NAME_MAX = 40;
export const MESSAGE_MAX = 140;

export type NoteErrors = Partial<Record<"donorName" | "message", string>>;
type NoteResult = { ok: true; note: DonorNote } | { ok: false; errors: NoteErrors };

// Trim, collapse runs of spaces and newlines, and drop invisible control
// characters. Empty means "not given" (null), not an empty string.
function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const tidy = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return tidy === "" ? null : tidy;
}

// Notes appear publicly on the wall, so links are refused: they're the
// main way spam gets in.
const LINK = /(https?:\/\/|www\.|\.(com|net|org|io|ly)\b)/i;

export function validateNote(input: { donorName?: unknown; message?: unknown }): NoteResult {
  const donorName = clean(input.donorName);
  const message = clean(input.message);
  const errors: NoteErrors = {};

  if (donorName && donorName.length > NAME_MAX) errors.donorName = `Keep your name under ${NAME_MAX} characters.`;
  if (message && message.length > MESSAGE_MAX) errors.message = `Keep your note under ${MESSAGE_MAX} characters.`;
  if (message && LINK.test(message)) errors.message = "Notes can't include links.";
  if (donorName && LINK.test(donorName)) errors.donorName = "Names can't include links.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, note: { donorName, message } };
}
