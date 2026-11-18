// DEVELOPMENT ONLY: deletes every table in the database from DATABASE_URL, then rebuilds and seeds it.
// Useful when you change a migration while learning. Never point this at a database with real data.
import { pool } from "../src/db.ts";
import { messageOf } from "../src/errors.ts";
import { migrate } from "./migrate.ts";
import { seed } from "./seed.ts";

try {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log("✔ dropped all tables");
  await migrate();
  await seed();
} catch (error) {
  console.error(`Reset failed: ${messageOf(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
