import { Router } from "express";
import { pool } from "../db.js";
import { normalizePhone } from "../phone.js";

export const messagesRouter = Router();

// POST /messages
//   { "receiverId": 2, "kind": "text", "text": "Hi!" }
//   { "receiverId": 3, "kind": "request", "amount": 3000 }
//   { "receiverId": 4, "kind": "contact", "contactName": "Diane", "contactPhone": "0788 555 123" }
// The sender is always me (req.user), from the sign-in ticket.
// Payments are not sent here: they go through POST /transfers, because they move money.
messagesRouter.post("/", async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, kind, text, amount } = req.body ?? {};
  const contactName = typeof req.body?.contactName === "string" ? req.body.contactName.trim() : "";
  const contactPhone = kind === "contact" ? normalizePhone(req.body?.contactPhone) : null;

  if (!Number.isInteger(receiverId)) {
    return res.status(400).json({ error: "receiverId must be a whole number" });
  }
  if (senderId === receiverId) return res.status(400).json({ error: "You can't message yourself" });
  if (kind === "text" && (typeof text !== "string" || !text.trim())) {
    return res.status(400).json({ error: "A text message needs some text" });
  }
  if (kind === "request" && (!Number.isInteger(amount) || amount <= 0)) {
    return res.status(400).json({ error: "amount must be a positive whole number of RWF" });
  }
  if (kind === "contact" && !contactName) return res.status(400).json({ error: "A shared contact needs a name" });
  if (kind === "contact" && !contactPhone) {
    return res.status(400).json({ error: "That contact's phone number doesn't look valid" });
  }
  if (kind !== "text" && kind !== "request" && kind !== "contact") {
    return res.status(400).json({ error: 'kind must be "text", "request" or "contact"' });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO messages (sender_id, receiver_id, kind, text, amount, contact_name, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, sender_id, receiver_id, kind, text, amount, contact_name, contact_phone, sent_at`,
      [
        senderId,
        receiverId,
        kind,
        kind === "text" ? text.trim() : null,
        kind === "request" ? amount : null,
        kind === "contact" ? contactName : null,
        contactPhone,
      ],
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
    if (error.code === "23503") return res.status(404).json({ error: "Receiver not found" });
    throw error;
  } finally {
    client.release();
  }
});
