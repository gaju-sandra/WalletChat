import { Router } from "express";
import { pool } from "../db.js";

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

// GET /users/1 → Sandra's profile and balance
usersRouter.get("/:id", async (req, res) => {
  const id = userIdFrom(req, res);
  if (id === null) return;

  // $1 is a placeholder: the value is sent separately from the SQL, so it can't inject SQL
  const { rows } = await pool.query(
    "SELECT id, name, phone, email, balance, monthly_budget, hide_balance, created_at FROM users WHERE id = $1",
    [id],
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
