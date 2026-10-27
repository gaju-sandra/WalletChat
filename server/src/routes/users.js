import { Router } from "express";
import { pool } from "../db.js";
import { normalizePhone } from "../phone.js";

export const usersRouter = Router();

// Turns "/users/abc" into a clear 400 error instead of a confusing database error
function userIdFrom(req, res, param = "id") {
  const id = Number(req.params[param]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: `${param} must be a positive whole number` });
    return null;
  }
  return id;
}

const USER_COLUMNS = "id, name, phone, email, balance, monthly_budget, hide_balance, created_at";

// GET /users/1 → Sandra's profile and balance
usersRouter.get("/:id", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;

  // $1 is a placeholder: the value is sent separately from the SQL, so it can't inject SQL
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

// PATCH /users/1  { "name"?: "...", "monthlyBudget"?: 100000, "hideBalance"?: true }
// Changes only the settings that were sent
usersRouter.patch("/:id", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;
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
    [id, name?.trim() ?? null, monthlyBudget ?? null, hideBalance ?? null],
  );
  if (rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

// GET /users/1/contacts → Sandra's chat list, most recent conversation first
usersRouter.get("/:id/contacts", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.phone, c.unread, c.added_at,
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
    [id],
  );
  res.json(rows);
});

// POST /users/1/contacts  { "name": "Diane Mukamana", "phone": "0788 555 123" }
// If someone already uses that number, they are added; otherwise a new user is created for them.
usersRouter.post("/:id/contacts", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;
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
       RETURNING id, name, phone`,
      [name, phone],
    );
    const person = people[0];

    if (person.id === id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "That's your own number." });
    }

    const { rows: added } = await client.query(
      `INSERT INTO contacts (owner_id, contact_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING unread, added_at`,
      [id, person.id],
    );
    if (added.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This number is already in your contacts." });
    }

    // Add it the other way round too, so they can chat back
    await client.query("INSERT INTO contacts (owner_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      person.id,
      id,
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

// POST /users/1/contacts/2/read → Sandra has read her chat with Aline
usersRouter.post("/:id/contacts/:contactId/read", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;
  const contactId = userIdFrom(req, res, "contactId");
  if (contactId === null) return;

  await pool.query("UPDATE contacts SET unread = 0 WHERE owner_id = $1 AND contact_id = $2", [id, contactId]);
  res.sendStatus(204); // done, nothing to send back
});

// GET /users/1/transactions → Sandra's money in and out, newest first
usersRouter.get("/:id/transactions", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;

  const { rows } = await pool.query(
    `SELECT id, title, subtitle, amount, category, created_at
       FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [id],
  );
  res.json(rows);
});

// GET /users/1/messages → every message Sandra sent or received, oldest first
usersRouter.get("/:id/messages", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;

  const { rows } = await pool.query(
    `SELECT id, sender_id, receiver_id, kind, text, amount, sent_at
       FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY sent_at`,
    [id],
  );
  res.json(rows);
});

// GET /users/1/messages/2 → the chat between Sandra (1) and Aline (2), oldest first like a chat screen
usersRouter.get("/:id/messages/:otherId", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;
  const otherId = userIdFrom(req, res, "otherId");
  if (otherId === null) return;

  const { rows } = await pool.query(
    `SELECT id, sender_id, receiver_id, kind, text, amount, sent_at,
            sender_id = $1 AS from_me
       FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY sent_at`,
    [id, otherId],
  );
  res.json(rows);
});
