// Runs every SQL file in db/migrations that has not run yet, in name order (001_, 002_, ...).
// PostgreSQL remembers which ones ran in the schema_migrations table, like SQLite's user_version on the phone.
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { pool } from "../src/db.js";

const folder = new URL("../db/migrations/", import.meta.url);

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query("SELECT name FROM schema_migrations");
  const done = new Set(rows.map((row) => row.name));
  const files = (await readdir(folder)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (done.has(file)) continue;

    const sql = await readFile(new URL(file, folder), "utf8");
    const client = await pool.connect();
    try {
      // All of the file runs, or none of it: a half-finished migration would leave a broken database
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✔ ran ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
  console.log("Database is up to date.");
}

// Run directly with `npm run db:migrate` (reset.js imports it instead)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
