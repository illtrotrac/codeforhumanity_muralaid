import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

// Login sessions. The browser holds a random token in a cookie; the
// database holds only the token's SHA-256 hash, plus who it belongs to.

export const SESSION_COOKIE = "muralaid_session";
const SESSION_DAYS = 7;

export type Admin = {
  id: number;
  email: string;
  role: "organisation" | "platform";
  organisationSlug: string | null; // null for platform admins
  organisationName: string | null;
};

type AdminRow = {
  id: number;
  email: string;
  password_hash: string;
  role: Admin["role"];
  org_slug: string | null;
  org_name: string | null;
};

const ADMIN_SELECT = `
  SELECT a.id, a.email, a.password_hash, a.role, o.slug AS org_slug, o.name AS org_name
    FROM admins a
    LEFT JOIN organisations o ON o.id = a.organisation_id`;

function toAdmin(row: AdminRow): Admin {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    organisationSlug: row.org_slug,
    organisationName: row.org_name,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// A real hash of a throwaway password, compared against when the email
// doesn't exist, so "no such user" takes as long as "wrong password" and
// response times don't reveal which emails have accounts.
const dummyHash = hashPassword("not-a-real-password");

export async function checkCredentials(email: string, password: string): Promise<Admin | null> {
  const row = getDb().prepare(`${ADMIN_SELECT} WHERE a.email = ?`).get(email.trim()) as
    | AdminRow
    | undefined;
  const ok = await verifyPassword(password, row?.password_hash ?? (await dummyHash));
  return row && ok ? toAdmin(row) : null;
}

export function createSession(adminId: number): { token: string; expires: Date } {
  const token = randomBytes(32).toString("base64url"); // 256 random bits: unguessable
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  getDb()
    .prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), adminId, expires.toISOString());
  return { token, expires };
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

function adminForToken(token: string | undefined): Admin | null {
  if (!token) return null;
  const row = getDb()
    .prepare(
      `${ADMIN_SELECT}
         JOIN sessions s ON s.admin_id = a.id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as AdminRow | undefined;
  return row ? toAdmin(row) : null;
}

// Who is logged in for the current request, if anyone. Works in pages and
// in route handlers (both can read the request's cookies).
export async function getCurrentAdmin(): Promise<Admin | null> {
  const store = await cookies();
  return adminForToken(store.get(SESSION_COOKIE)?.value);
}

// Platform admins manage everything; organisation admins only their own murals.
export function canManage(admin: Admin | null, organisationSlug: string): boolean {
  if (!admin) return false;
  return admin.role === "platform" || admin.organisationSlug === organisationSlug;
}
