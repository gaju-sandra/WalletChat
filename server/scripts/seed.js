// Fills the tables with the development data in db/seed.sql (clears them first)
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { pool } from "../src/db.js";

export async function seed() {
  const sql = await readFile(new URL("../db/seed.sql", import.meta.url), "utf8");
  await pool.query(sql);
  console.log("✔ seeded the database with development data");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .catch((error) => {
      console.error(`Seeding failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
