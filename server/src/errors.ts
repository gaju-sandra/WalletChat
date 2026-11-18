import pg from "pg";

// In TypeScript a caught error is `unknown` (anything can be thrown), so check what it is before reading it
export function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// PostgreSQL code 23503 = foreign key violation: a row points at a user id that doesn't exist
export function isForeignKeyError(error: unknown) {
  return error instanceof pg.DatabaseError && error.code === "23503";
}
