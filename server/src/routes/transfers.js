import { Router } from "express";
import { pool } from "../db.js";

export const transfersRouter = Router();

// POST /transfers  { "fromUserId": 1, "toUserId": 2, "amount": 5000 }
// Sends money from one person to another. Five changes that must all happen, or none:
// two balances, two transactions (one each), and a payment message in their chat.
transfersRouter.post("/", async (req, res) => {
  const { fromUserId, toUserId, amount } = req.body ?? {};

  if (!Number.isInteger(fromUserId) || !Number.isInteger(toUserId)) {
    return res.status(400).json({ error: "fromUserId and toUserId must be whole numbers" });
  }
  if (fromUserId === toUserId) return res.status(400).json({ error: "You can't send money to yourself" });
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive whole number of RWF" });
  }

  const client = await pool.connect(); // one connection for the whole transaction
  try {
    await client.query("BEGIN");

    // FOR UPDATE locks both rows until COMMIT, so two transfers at the same moment can't both spend the
    // same money. Locking in id order (ORDER BY id) stops two transfers waiting on each other forever.
    const { rows: people } = await client.query(
      "SELECT id, name, balance FROM users WHERE id = ANY($1) ORDER BY id FOR UPDATE",
      [[fromUserId, toUserId]],
    );
    const sender = people.find((p) => p.id === fromUserId);
    const receiver = people.find((p) => p.id === toUserId);

    if (!sender || !receiver) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sender or receiver not found" });
    }
    if (sender.balance < amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough balance" });
    }

    await client.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [amount, sender.id]);
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, receiver.id]);

    await client.query(
      `INSERT INTO transactions (user_id, title, subtitle, amount, category) VALUES
         ($1, $2, 'Sent in chat',     $3, 'transfer'),
         ($4, $5, 'Received in chat', $6, 'transfer')`,
      [sender.id, receiver.name, -amount, receiver.id, sender.name, amount],
    );

    const { rows: messageRows } = await client.query(
      `INSERT INTO messages (sender_id, receiver_id, kind, amount)
       VALUES ($1, $2, 'payment', $3)
       RETURNING id, sender_id, receiver_id, kind, amount, sent_at`,
      [sender.id, receiver.id, amount],
    );

    // The receiver has one more unread message from the sender (if the sender is in their contacts)
    await client.query("UPDATE contacts SET unread = unread + 1 WHERE owner_id = $1 AND contact_id = $2", [
      receiver.id,
      sender.id,
    ]);

    await client.query("COMMIT");
    res.status(201).json({ message: messageRows[0], senderBalance: sender.balance - amount });
  } catch (error) {
    await client.query("ROLLBACK"); // undo everything done since BEGIN
    throw error; // the error handler in index.js turns this into a 500 response
  } finally {
    client.release(); // give the connection back to the pool
  }
});
