import { pool } from "./db.ts";
import { messageOf } from "./errors.ts";

// Push notifications reach a phone even when WalletChat is closed. We don't talk to Apple or Google
// ourselves: we give the message to Expo's push service, which delivers it. Each phone's address
// ("ExponentPushToken[…]") is saved in push_tokens when the app starts (POST /me/push-token).

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type Push = {
  title: string; // e.g. the sender's name
  body: string; // e.g. "Sent you RWF 5,000"
  data?: Record<string, unknown>; // for the app when the notification is tapped, e.g. which chat to open
};

// What Expo answers for each message: "ok", or "error" with a reason
type Ticket = { status: "ok" | "error"; details?: { error?: string } };

export const isPushToken = (value: unknown): value is string =>
  typeof value === "string" && /^Expo(nent)?PushToken\[[\w-]+\]$/.test(value);

// Sends to every phone the user is signed in on. Never throws: a notification that doesn't arrive
// must not undo the message or payment that caused it, so problems are only logged.
export async function sendPush(userId: number, push: Push) {
  try {
    const { rows } = await pool.query<{ token: string }>("SELECT token FROM push_tokens WHERE user_id = $1", [userId]);
    if (rows.length === 0) return;

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(rows.map(({ token }) => ({ to: token, sound: "default", ...push }))),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return console.warn(`Expo push answered ${response.status}`);

    // The tickets come back in the same order as the tokens. "DeviceNotRegistered" means the app was
    // deleted or notifications were turned off on that phone: forget that token.
    const { data: tickets } = (await response.json()) as { data: Ticket[] };
    const gone = rows.filter((_, i) => tickets[i]?.details?.error === "DeviceNotRegistered").map((r) => r.token);
    if (gone.length > 0) await pool.query("DELETE FROM push_tokens WHERE token = ANY($1)", [gone]);
  } catch (error) {
    console.warn("Couldn't send a push notification:", messageOf(error));
  }
}
