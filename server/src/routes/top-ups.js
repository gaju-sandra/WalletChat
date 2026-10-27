import { Router } from "express";
import { pool } from "../db.js";

export const topUpsRouter = Router();

const MAX_TOP_UP = 1_000_000;
const SOURCES = ["MTN MoMo", "Airtel Money", "Bank"];

// POST /top-ups  { "userId": 1, "amount": 10000, "source": "MTN MoMo" }
// (Pretend money: a real app would first take it from the mobile money account.)
topUpsRouter.post("/", async (req, res) => {
  const { userId, amount, source } = req.body ?? {};

  if (!Number.isInteger(userId)) return res.status(400).json({ error: "userId must be a whole number" });
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive whole number of RWF" });
  }
  if (amount > MAX_TOP_UP) return res.status(400).json({ error: "The most you can top up at once is RWF 1,000,000" });
  if (!SOURCES.includes(source)) return res.status(400).json({ error: `source must be one of: ${SOURCES.join(", ")}` });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [amount, userId],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }
    await client.query(
      "INSERT INTO transactions (user_id, title, subtitle, amount, category) VALUES ($1, 'Top up', $2, $3, 'income')",
      [userId, source, amount],
    );
    await client.query("COMMIT");
    res.status(201).json({ balance: rows[0].balance });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
