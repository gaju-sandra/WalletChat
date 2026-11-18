import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { pool } from "../db.ts";
import { normalizePhone } from "../phone.ts";
import { requireUser } from "../auth.ts";

// Everything here is about "me": the signed-in person. There is no user id in the address any more,
// so nobody can read or change someone else's wallet by changing a number.
export const meRouter = Router();

const USER_COLUMNS = "id, name, phone, email, image_url, balance, monthly_budget, hide_balance, created_at";

// POST /me  { "name": "Sandra Gaju", "phone": "0788 000 000" }
// Creates your wallet the first time you sign in. Your email comes from Clerk (already verified with a
// code). The phone number comes from the Create account form, so it is NOT verified: see the rule below.
meRouter.post("/", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Please sign in.", code: "signed_out" });
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const phone = normalizePhone(req.body?.phone);
  if (!name) return res.status(400).json({ error: "Enter your name." });
  if (!phone) return res.status(400).json({ error: "Enter a valid phone number, e.g. 0788 123 456." });

  const clerkUser = await clerkClient.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;

  // If someone already added this number as a contact, that row is waiting for its owner. Because the
  // phone isn't verified, we only hand it over while it has no money history: otherwise anyone could type
  // a stranger's number and take money that was sent to it.
  const { rows } = await pool.query(
    `INSERT INTO users (name, phone, email, clerk_user_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE
        SET name = EXCLUDED.name, email = EXCLUDED.email, clerk_user_id = EXCLUDED.clerk_user_id
      WHERE users.clerk_user_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = users.id)
     RETURNING ${USER_COLUMNS}`,
    [name, phone, email, userId],
  );
  // No row back = this phone already belongs to someone else's wallet
  if (rows.length === 0) {
    return res.status(409).json({ error: "This phone number is already used by another wallet." });
  }
  res.status(201).json(rows[0]);
});

// Every route below needs a signed-in user with a wallet
meRouter.use(requireUser);

// GET /me → my profile and balance
meRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
  res.json(rows[0]);
});

// PATCH /me  { "name"?: "...", "monthlyBudget"?: 100000, "hideBalance"?: true }
// Changes only the settings that were sent
meRouter.patch("/", async (req, res) => {
  const { name, monthlyBudget, hideBalance } = req.body ?? {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ error: "name can't be empty" });
  }
  if (monthlyBudget !== undefined && (!Number.isInteger(monthlyBudget) || monthlyBudget <= 0)) {
    return res.status(400).json({ error: "monthlyBudget must be a positive whole number" });
  }
  if (hideBalance !== undefined && typeof hideBalance !== "boolean") {
    return res.status(400).json({ error: "hideBalance must be true or false" });
  }

  // COALESCE(new, old): keep the old value when that setting wasn't sent (NULL)
  const { rows } = await pool.query(
    `UPDATE users
        SET name           = COALESCE($2, name),
            monthly_budget = COALESCE($3, monthly_budget),
            hide_balance   = COALESCE($4, hide_balance)
      WHERE id = $1
      RETURNING ${USER_COLUMNS}`,
    [req.user.id, name?.trim() ?? null, monthlyBudget ?? null, hideBalance ?? null],
  );
  res.json(rows[0]);
});

// POST /me/picture → copy my profile picture's address from Clerk (call it after changing the picture)
// The app uploads the picture to Clerk itself. The server then asks Clerk for the address instead of
// taking one from the app, so nobody can point their picture at some other website.
meRouter.post("/picture", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Please sign in.", code: "signed_out" });
  const clerkUser = await clerkClient.users.getUser(userId);
  // Clerk gives everyone a generated placeholder image; hasImage is only true for a real uploaded photo
  const imageUrl = clerkUser.hasImage ? clerkUser.imageUrl : null;
  const { rows } = await pool.query(`UPDATE users SET image_url = $2 WHERE id = $1 RETURNING ${USER_COLUMNS}`, [
    req.user.id,
    imageUrl,
  ]);
  res.json(rows[0]);
});

// GET /me/contacts → my chat list, most recent conversation first
meRouter.get("/contacts", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.phone, u.image_url, c.unread, c.added_at,
            u.clerk_user_id IS NOT NULL AS on_walletchat, -- true = they have an account and can use money
            -- latest of "when added" and "newest message either way"; GREATEST skips NULLs
            GREATEST(c.added_at, MAX(m.sent_at)) AS last_activity
       FROM contacts c
       JOIN users u ON u.id = c.contact_id
       LEFT JOIN messages m
         ON (m.sender_id = c.owner_id AND m.receiver_id = c.contact_id)
         OR (m.sender_id = c.contact_id AND m.receiver_id = c.owner_id)
      WHERE c.owner_id = $1
      GROUP BY u.id, c.unread, c.added_at
      ORDER BY last_activity DESC`,
    [req.user.id],
  );
  res.json(rows);
});

// POST /me/contacts  { "name": "Diane Mukamana", "phone": "0788 555 123" }
// If someone already uses that number, they are added; otherwise a row is created for them,
// waiting for them to sign up (clerk_user_id stays NULL until then).
meRouter.post("/contacts", async (req, res) => {
  const me = req.user.id;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const phone = normalizePhone(req.body?.phone);

  if (!name) return res.status(400).json({ error: "Enter a name." });
  if (!phone) return res.status(400).json({ error: "Enter a valid phone number, e.g. 0788 123 456." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find the person by phone, or create them. ON CONFLICT … DO UPDATE returns the existing row too.
    const { rows: people } = await client.query(
      `INSERT INTO users (name, phone) VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, name, phone, image_url, clerk_user_id IS NOT NULL AS on_walletchat`,
      [name, phone],
    );
    const person = people[0];

    if (person.id === me) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "That's your own number." });
    }

    const { rows: added } = await client.query(
      `INSERT INTO contacts (owner_id, contact_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING unread, added_at`,
      [me, person.id],
    );
    if (added.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This number is already in your contacts." });
    }

    // Add it the other way round too, so they can chat back
    await client.query("INSERT INTO contacts (owner_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      person.id,
      me,
    ]);

    await client.query("COMMIT");
    res.status(201).json({ ...person, unread: added[0].unread, added_at: added[0].added_at });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

// POST /me/contacts/2/read → I have read my chat with user 2
meRouter.post("/contacts/:contactId/read", async (req, res) => {
  const contactId = Number(req.params.contactId);
  if (!Number.isInteger(contactId) || contactId <= 0) {
    return res.status(400).json({ error: "contactId must be a positive whole number" });
  }
  await pool.query("UPDATE contacts SET unread = 0 WHERE owner_id = $1 AND contact_id = $2", [
    req.user.id,
    contactId,
  ]);
  res.sendStatus(204); // done, nothing to send back
});

// GET /me/transactions → my money in and out, newest first
meRouter.get("/transactions", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, subtitle, amount, category, created_at
       FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [req.user.id],
  );
  res.json(rows);
});

// GET /me/messages → every message I sent or received, oldest first
meRouter.get("/messages", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, sender_id, receiver_id, kind, text, amount, contact_name, contact_phone, sent_at
       FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY sent_at`,
    [req.user.id],
  );
  res.json(rows);
});

// GET /me/messages/2 → my chat with user 2, oldest first like a chat screen
meRouter.get("/messages/:otherId", async (req, res) => {
  const otherId = Number(req.params.otherId);
  if (!Number.isInteger(otherId) || otherId <= 0) {
    return res.status(400).json({ error: "otherId must be a positive whole number" });
  }
  const { rows } = await pool.query(
    `SELECT id, sender_id, receiver_id, kind, text, amount, contact_name, contact_phone, sent_at,
            sender_id = $1 AS from_me
       FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY sent_at`,
    [req.user.id, otherId],
  );
  res.json(rows);
});
