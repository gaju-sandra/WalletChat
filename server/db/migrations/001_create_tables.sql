-- 001: the first version of the WalletChat database.
-- Migrations run in file-name order, once each (see scripts/migrate.js).
-- Never edit a migration after it has run: add a new file, e.g. 002_add_avatar.sql.

-- Everyone who uses the app. On the phone there was one profile; here there are many people.
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,                      -- 1, 2, 3... chosen by PostgreSQL
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL UNIQUE,                    -- no two people with the same number
  email          TEXT UNIQUE,
  balance        BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0), -- whole RWF; can never go negative
  monthly_budget BIGINT NOT NULL DEFAULT 150000 CHECK (monthly_budget > 0),
  hide_balance   BOOLEAN NOT NULL DEFAULT FALSE,           -- PostgreSQL has real booleans
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()        -- a real date + time + time zone
);

-- Who is in whose contact list. A "link" table: one row = "owner has contact in their list".
CREATE TABLE contacts (
  owner_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  unread     INTEGER NOT NULL DEFAULT 0 CHECK (unread >= 0), -- unread messages from them, for the owner
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, contact_id),                    -- can't add the same person twice
  CHECK (owner_id <> contact_id)                         -- can't add yourself
);

-- Chat messages between two people.
CREATE TABLE messages (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users (id),
  receiver_id INTEGER NOT NULL REFERENCES users (id),
  kind        TEXT NOT NULL CHECK (kind IN ('text', 'payment', 'request')),
  text        TEXT,
  amount      BIGINT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A text message has text and no amount; a payment or request has an amount and no text
  CHECK (
    (kind = 'text' AND text IS NOT NULL AND amount IS NULL)
    OR (kind <> 'text' AND amount > 0 AND text IS NULL)
  )
);

-- Makes "all messages between person A and person B, in order" fast, whichever of them sent each one
CREATE INDEX messages_conversation_idx
  ON messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), sent_at);

-- Each person's money in and out (what Home's "Recent activity" and Insights show).
-- A transfer creates TWO rows: -5000 for the sender and +5000 for the receiver.
CREATE TABLE transactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  title      TEXT NOT NULL,
  subtitle   TEXT NOT NULL DEFAULT '',
  amount     BIGINT NOT NULL CHECK (amount <> 0),        -- negative = money out
  category   TEXT NOT NULL CHECK (category IN ('transfer', 'income', 'transport', 'bills', 'shopping')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX transactions_user_date_idx ON transactions (user_id, created_at DESC);
