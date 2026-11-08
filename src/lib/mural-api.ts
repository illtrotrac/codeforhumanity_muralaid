import type { DemoAction, Mural, MuralTile, Need } from "./types";
import type { NeedErrors } from "./need-validation";

// The browser's side of the API: one function per endpoint, so components
// never build URLs or parse responses themselves.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; errors?: NeedErrors };

async function request<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, data: body as T };
    return {
      ok: false,
      status: response.status,
      error: body.error ?? `Request failed (${response.status}).`,
      errors: body.errors,
    };
  } catch {
    // fetch itself throws when the server can't be reached at all.
    return { ok: false, status: 0, error: "Can't reach the server. Check your connection." };
  }
}

const base = (slug: string) => `/api/murals/${encodeURIComponent(slug)}`;
const json = { "Content-Type": "application/json" };

export const muralApi = {
  get: (slug: string) => request<Mural>(base(slug), { cache: "no-store" }),

  pledge: (slug: string, tileId: number) =>
    request<{ tile: MuralTile; completed: boolean }>(`${base(slug)}/tiles/${tileId}/pledge`, {
      method: "POST",
    }),

  saveNeed: (slug: string, tileId: number, need: Need) =>
    request<{ tile: MuralTile }>(`${base(slug)}/tiles/${tileId}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify(need),
    }),

  demo: (slug: string, action: DemoAction) =>
    request<Mural>(`${base(slug)}/demo`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ action }),
    }),
};
