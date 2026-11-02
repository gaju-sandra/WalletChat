import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { pool } from "../db.js";
import { normalizePhone } from "../phone.js";

export const messagesRouter = Router();

// Where chat photos are saved: server/uploads/
const UPLOADS_DIR = path.resolve(import.meta.dirname, "../../uploads");
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

// The first bytes of a file say what it really is, whatever its name claims. Only real pictures are kept.
function photoExtension(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "webp";
  if (bytes.subarray(4, 8).toString() === "ftyp") return "heic"; // iPhone photos
  return null;
}

// Adds a photo message and gives the receiver one more unread, all or nothing
async function savePhotoMessage(senderId, receiverId, fileName) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO messages (sender_id, receiver_id, kind, photo_file)
       VALUES ($1, $2, 'photo', $3)
       RETURNING id, sender_id, receiver_id, kind, text, amount, contact_name, contact_phone, sent_at`,
      [senderId, receiverId, fileName],
    );
    await client.query("UPDATE contacts SET unread = unread + 1 WHERE owner_id = $1 AND contact_id = $2", [
      receiverId,
      senderId,
    ]);
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// POST /messages/photo  { "receiverId": 23, "photo": "data:image/jpeg;base64,/9j/4AAQ…" }
// Saves the picture in uploads/ under a random name, then adds a "photo" message pointing to it
messagesRouter.post("/photo", async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, photo } = req.body ?? {};

  if (!Number.isInteger(receiverId)) return res.status(400).json({ error: "receiverId must be a whole number" });
  if (senderId === receiverId) return res.status(400).json({ error: "You can't message yourself" });

  const base64 = typeof photo === "string" ? photo.match(/^data:image\/[\w.+-]+;base64,(.+)$/)?.[1] : undefined;
  if (!base64) return res.status(400).json({ error: "photo must be a data:image/…;base64 picture" });
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_PHOTO_BYTES) return res.status(413).json({ error: "That photo is too big (8 MB at most)." });
  const extension = photoExtension(bytes);
  if (!extension) return res.status(400).json({ error: "That file isn't a photo we can show." });

  // A random name nobody can guess, so one photo can't be found from another's name
  const fileName = `${randomUUID()}.${extension}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, fileName), bytes);

  try {
    const message = await savePhotoMessage(senderId, receiverId, fileName);
    res.status(201).json(message);
  } catch (error) {
    await unlink(path.join(UPLOADS_DIR, fileName)).catch(() => {}); // no message, so no file either
    if (error.code === "23503") return res.status(404).json({ error: "Receiver not found" });
    throw error;
  }
});

// GET /messages/42/photo → the picture of photo message 42, only for the two people in that chat
messagesRouter.get("/:id/photo", async (req, res) => {
  const messageId = Number(req.params.id);
  if (!Number.isInteger(messageId) || messageId <= 0) return res.status(400).json({ error: "Bad message id" });

  const { rows } = await pool.query(
    `SELECT photo_file FROM messages
      WHERE id = $1 AND kind = 'photo' AND (sender_id = $2 OR receiver_id = $2)`,
    [messageId, req.user.id],
  );
  // Same answer for "doesn't exist" and "not yours", so nobody can find out which photos exist
  if (rows.length === 0) return res.status(404).json({ error: "Photo not found" });

  // "private": the phone may keep a copy, but shared caches (like a proxy) may not
  res.sendFile(rows[0].photo_file, { root: UPLOADS_DIR, headers: { "Cache-Control": "private, max-age=31536000" } });
});

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
