import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Password hashing with scrypt: deliberately slow and memory-hungry, so a
// stolen hash takes years to brute-force instead of seconds. The async
// version runs on a worker thread, so a login doesn't freeze the server.
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;

// A random salt per password means two people with the same password get
// different hashes, and precomputed "rainbow tables" are useless.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// Blocking version, for seeding at startup only. Never call it per request.
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  // timingSafeEqual takes the same time whether the first byte or the last
  // one differs, so attackers can't guess the hash by measuring responses.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
