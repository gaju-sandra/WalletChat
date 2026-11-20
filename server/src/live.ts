import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyToken } from "@clerk/express";
import { pool } from "./db.ts";

// Live updates: each open app keeps one WebSocket (a line that stays open) to the server at /live.
// When something changes for you (a new message, money received), the server sends {"type":"changed"}
// down your line and the app reloads. The ping carries no data: the app still fetches it the normal,
// checked way, so nothing private travels over this line.

const HELLO_TIMEOUT_MS = 5_000; // a phone must say who it is within 5 seconds, or it's closed
const HEARTBEAT_MS = 30_000; // check every 30 seconds that each phone is still there

// Who is connected: user id → their open lines (one per phone, or more if signed in on several)
const linesByUser = new Map<number, Set<WebSocket>>();

// Tell these users' apps that their data changed. Safe to call for users who aren't connected.
export function notifyChanged(userIds: number[]) {
  const message = JSON.stringify({ type: "changed" });
  for (const userId of new Set(userIds)) {
    for (const line of linesByUser.get(userId) ?? []) {
      if (line.readyState === line.OPEN) line.send(message);
    }
  }
}

// The first message on a new line must be {"type":"hello","token":"<Clerk session token>"}.
// The same check as requireUser (auth.ts): the token says who you are, never the app itself.
async function whoIsThis(raw: string): Promise<number | null> {
  let hello: { type?: unknown; token?: unknown };
  try {
    hello = JSON.parse(raw);
  } catch {
    return null;
  }
  if (hello.type !== "hello" || typeof hello.token !== "string") return null;

  try {
    const claims = await verifyToken(hello.token, { secretKey: process.env.CLERK_SECRET_KEY });
    const { rows } = await pool.query<{ id: number }>("SELECT id FROM users WHERE clerk_user_id = $1", [claims.sub]);
    return rows[0]?.id ?? null;
  } catch {
    return null; // expired, fake or from another app
  }
}

export function startLive(server: Server) {
  // maxPayload: phones only ever send the small hello, so anything bigger is refused
  const wss = new WebSocketServer({ server, path: "/live", maxPayload: 8 * 1024 });

  wss.on("connection", (line) => {
    let userId: number | null = null;
    let alive = true;
    line.on("pong", () => (alive = true));

    const helloTimer = setTimeout(() => line.close(4001, "Say hello first"), HELLO_TIMEOUT_MS);

    line.once("message", async (data) => {
      clearTimeout(helloTimer);
      userId = await whoIsThis(data.toString());
      if (userId === null) return line.close(4001, "Please sign in");
      if (line.readyState !== line.OPEN) return; // the phone left while we were checking

      if (!linesByUser.has(userId)) linesByUser.set(userId, new Set());
      linesByUser.get(userId)!.add(line);
      line.send(JSON.stringify({ type: "ready" }));
    });

    // Phones that lose signal often don't say goodbye: ping them, and close lines that stop answering
    const heartbeat = setInterval(() => {
      if (!alive) return line.terminate();
      alive = false;
      line.ping();
    }, HEARTBEAT_MS);

    line.on("close", () => {
      clearTimeout(helloTimer);
      clearInterval(heartbeat);
      if (userId === null) return;
      const lines = linesByUser.get(userId);
      lines?.delete(line);
      if (lines?.size === 0) linesByUser.delete(userId);
    });
    line.on("error", () => line.terminate());
  });
}
