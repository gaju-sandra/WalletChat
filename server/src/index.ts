import express, { type NextFunction, type Request, type Response } from "express";
import { clerkMiddleware } from "@clerk/express";
import { pool } from "./db.ts";
import { requireUser } from "./auth.ts";
import { startLive } from "./live.ts";
import { messageOf } from "./errors.ts";
import { meRouter } from "./routes/me.ts";
import { transfersRouter } from "./routes/transfers.ts";
import { messagesRouter } from "./routes/messages.ts";
import { topUpsRouter } from "./routes/top-ups.ts";

const app = express();

// Photos arrive as text (base64) inside JSON, which is much bigger than a normal request, so this one
// route may send up to 12 MB. It must come before the line below, which allows only 100 KB.
app.use("/messages/photo", express.json({ limit: "12mb" }));
app.use(express.json()); // read JSON request bodies into req.body

// Allow the Expo web preview (a different port) to call this API while developing
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Checks the Clerk ticket (Authorization: Bearer …) on every request, so routes can ask getAuth(req)
// who is signed in. It doesn't block anything by itself: requireUser does that, per route.
app.use(clerkMiddleware());

// Is the server up, and can it reach the database? (public: no sign-in needed)
app.get("/health", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT now() AS database_time");
    res.json({ ok: true, databaseTime: rows[0].database_time });
  } catch (error) {
    res.status(503).json({ ok: false, error: `Can't reach the database: ${messageOf(error)}` });
  }
});

// Everything below needs a signed-in user (requireUser), so nobody can touch someone else's wallet
app.use("/me", meRouter); // requireUser is applied inside, after POST /me (creating your wallet)
app.use("/transfers", requireUser, transfersRouter);
app.use("/messages", requireUser, messagesRouter);
app.use("/top-ups", requireUser, topUpsRouter);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// Any error thrown in a route ends up here (Express 5 also catches errors from async routes).
// body-parser, which reads the JSON bodies, puts a `type` on its errors.
app.use((error: { type?: string }, req: Request, res: Response, next: NextFunction) => {
  // Problems with the request itself (too big: 413, broken JSON: 400) are the sender's mistake, not a crash
  if (error.type === "entity.too.large") return res.status(413).json({ error: "That request is too big." });
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "The request body isn't valid JSON." });
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 = accept connections from other devices on your Wi-Fi too, like your iPhone
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`WalletChat API running on http://localhost:${port} (live updates on ws://…:${port}/live)`);
});
startLive(server); // the WebSocket lines share the same port as the API
