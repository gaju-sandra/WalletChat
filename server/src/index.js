import express from "express";
import { pool } from "./db.js";
import { usersRouter } from "./routes/users.js";
import { transfersRouter } from "./routes/transfers.js";

const app = express();

app.use(express.json()); // read JSON request bodies into req.body

// Allow the Expo web preview (a different port) to call this API while developing
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Is the server up, and can it reach the database?
app.get("/health", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT now() AS database_time");
    res.json({ ok: true, databaseTime: rows[0].database_time });
  } catch (error) {
    res.status(503).json({ ok: false, error: `Can't reach the database: ${error.message}` });
  }
});

app.use("/users", usersRouter);
app.use("/transfers", transfersRouter);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// Any error thrown in a route ends up here (Express 5 also catches errors from async routes)
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 = accept connections from other devices on your Wi-Fi too, like your iPhone
app.listen(port, "0.0.0.0", () => {
  console.log(`WalletChat API running on http://localhost:${port}`);
});
