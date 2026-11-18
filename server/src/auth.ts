import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { pool } from "./db.ts";
import type { AuthUser } from "./types.d.ts";

// Runs before every protected route, like a guard at the door:
// 1. clerkMiddleware (in index.ts) has already checked the "ticket" (Clerk token) in the Authorization header.
// 2. getAuth(req).userId tells us WHO it is, e.g. "user_2abc…", or null if there is no valid ticket.
// 3. We find that person's row in our own users table and put it on req.user for the route to use.
// The app can no longer say "I am user 1": the server decides who you are from the ticket.
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Please sign in.", code: "signed_out" });
  }

  const { rows } = await pool.query<AuthUser>("SELECT id, name, phone FROM users WHERE clerk_user_id = $1", [userId]);
  if (rows.length === 0) {
    // Signed in with Clerk, but no WalletChat profile yet: the app shows "Create your wallet"
    return res.status(404).json({ error: "Create your wallet profile first.", code: "profile_missing" });
  }

  req.user = rows[0];
  next();
}
