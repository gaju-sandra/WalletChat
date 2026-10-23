import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Copy .env.example to .env and fill it in.");
}

// PostgreSQL BIGINT (type id 20) can be bigger than JavaScript numbers can hold, so `pg` returns it as a
// string by default ("250000"). Our amounts are whole RWF, far below that limit, so read them as numbers.
pg.types.setTypeParser(20, (value) => Number(value));

// A pool keeps a few connections open and lends one to each query, instead of connecting every time
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
