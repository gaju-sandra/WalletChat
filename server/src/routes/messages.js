import { Router } from "express";
import { pool } from "../db.js";

export const messagesRouter = Router();

// POST /messages
//   { "senderId": 1, "receiverId": 2, "kind": "text", "text": "Hi!" }
//   { "senderId": 1, "receiverId": 3, "kind": "request", "amount": 3000 }
// Payments are not sent here: they go through POST /transfers, because they move money.
messagesRouter.post("/", async (req, res) => {
  const { senderId, receiverId, kind, text, amount } = req.body ?? {};

  if (!Number.isInteger(senderId) || !Number.isInteger(receiverId)) {
    return res.status(400).json({ error: "senderId and receiverId must be whole numbers" });
  }
  if (senderId === receiverId) return res.status(400).json({ error: "You can't message yourself" });
  if (kind === "text" && (typeof text !== "string" || !text.trim())) {
    return res.status(400).json({ error: "A text message needs some text" });
  }
  if (kind === "request" && (!Number.isInteger(amount) || amount <= 0)) {
    return res.status(400).json({ error: "amount must be a positive whole number of RWF" });
  }
  if (kind !== "text" && kind !== "request") {
    return res.status(400).json({ error: 'kind must be "text" or "request"' });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO messages (sender_id, receiver_id, kind, text, amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_id, receiver_id, kind, text, amount, sent_at`,
      [senderId, receiverId, kind, kind === "text" ? text.trim() : null, kind === "request" ? amount : null],
    );
    // One more unread message for the receiver
    await client.query("UPDATE contacts SET unread = unread + 1 WHERE owner_id = $1 AND contact_id = $2", [
      receiverId,
      senderId,
    ]);
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    // 23503 = foreign key violation: senderId or receiverId isn't a real user
    if (error.code === "23503") return res.status(404).json({ error: "Sender or receiver not found" });
    throw error;
  } finally {
    client.release();
  }
});
