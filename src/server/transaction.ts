import type { DatabaseSync } from "node:sqlite";

// Run a function inside a transaction: either every change in it is saved,
// or (if anything throws) none of them are.
//
// BEGIN IMMEDIATE takes the write lock up front, so two requests can't both
// read "tile is locked" and then both fund it.
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
