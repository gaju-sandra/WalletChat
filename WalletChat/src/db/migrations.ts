import type { SQLiteDatabase } from "expo-sqlite";
import { balance, contacts, messages, profile, transactions, unreadCounts } from "@/data/mock";

// Bump this and add a new `if (currentVersion === N)` block whenever the tables change
const DATABASE_VERSION = 2;

// Runs every time the app opens. SQLite remembers which version it is at in `PRAGMA user_version`,
// so each block below only ever runs once per phone.
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let currentVersion = result?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE contacts (
        id       TEXT PRIMARY KEY NOT NULL,
        name     TEXT NOT NULL,
        initials TEXT NOT NULL,
        tone     TEXT NOT NULL,
        phone    TEXT,
        unread   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE transactions (
        id       TEXT PRIMARY KEY NOT NULL,
        title    TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        amount   INTEGER NOT NULL,  -- negative = money out
        category TEXT NOT NULL,
        date     TEXT NOT NULL      -- ISO date
      );

      CREATE TABLE messages (
        id         TEXT PRIMARY KEY NOT NULL,
        contact_id TEXT NOT NULL REFERENCES contacts (id),
        from_me    INTEGER NOT NULL, -- SQLite has no boolean: 1 = true, 0 = false
        time       TEXT NOT NULL,
        kind       TEXT NOT NULL,    -- 'text' | 'payment' | 'request'
        text       TEXT,             -- only for kind = 'text'
        amount     INTEGER           -- only for kind = 'payment' or 'request'
      );

      -- One row per setting, e.g. ('monthly_budget', '150000')
      CREATE TABLE settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    await seed(db);
    currentVersion = 1;
  }

  // Version 2: messages store the real moment they were sent (sent_at, an ISO date) instead of a
  // display label like "Yesterday", so chats can be sorted newest first. Contacts remember when they
  // were added. Dropping the old messages table is safe here only because the app has not saved any
  // real messages in it yet. With real data you would copy the rows across instead.
  if (currentVersion === 1) {
    await db.execAsync(`
      DROP TABLE messages;

      CREATE TABLE messages (
        id         TEXT PRIMARY KEY NOT NULL,
        contact_id TEXT NOT NULL REFERENCES contacts (id),
        from_me    INTEGER NOT NULL, -- SQLite has no boolean: 1 = true, 0 = false
        sent_at    TEXT NOT NULL,    -- ISO date
        kind       TEXT NOT NULL,    -- text | payment | request
        text       TEXT,             -- only for kind = text
        amount     INTEGER           -- only for kind = payment or request
      );

      ALTER TABLE contacts ADD COLUMN added_at TEXT; -- ISO date, NULL for the starting contacts
    `);
    await seedMessages(db);
    currentVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// Version 1 starting data: the same people, history and settings as the mock data
async function seed(db: SQLiteDatabase) {
  // A transaction makes all the inserts succeed together, or none at all
  await db.withTransactionAsync(async () => {
    for (const c of contacts) {
      await db.runAsync(
        "INSERT INTO contacts (id, name, initials, tone, phone, unread) VALUES (?, ?, ?, ?, ?, ?)",
        c.id,
        c.name,
        c.initials,
        c.tone,
        c.phone ?? null,
        unreadCounts[c.id] ?? 0,
      );
    }

    for (const t of transactions) {
      await db.runAsync(
        "INSERT INTO transactions (id, title, subtitle, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)",
        t.id,
        t.title,
        t.subtitle,
        t.amount,
        t.category,
        t.date,
      );
    }

    const settings: [string, string][] = [
      ["balance", String(balance)],
      ["monthly_budget", "150000"],
      ["hide_balance", "0"],
      ["profile_name", profile.name],
      ["profile_email", profile.email],
      ["profile_phone", profile.phone],
    ];
    for (const [key, value] of settings) {
      await db.runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", key, value);
    }
  });
}

// Version 2 starting data: the mock chat messages, with their real send times
async function seedMessages(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    for (const m of messages) {
      await db.runAsync(
        "INSERT INTO messages (id, contact_id, from_me, sent_at, kind, text, amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
        m.id,
        m.contactId,
        m.fromMe ? 1 : 0,
        m.sentAt,
        m.kind,
        m.kind === "text" ? m.text : null,
        m.kind === "text" ? null : m.amount,
      );
    }
  });
}
