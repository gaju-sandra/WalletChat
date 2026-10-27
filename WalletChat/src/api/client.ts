// Where the WalletChat server runs. Set EXPO_PUBLIC_API_URL in WalletChat/.env.local
// (it must be read exactly like this, with dot notation, for Expo to fill it in)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// No login yet: the app always acts as Sandra, user 1 in the server's seed data
export const CURRENT_USER_ID = 1;

type RequestOptions = { method?: "GET" | "POST" | "PATCH"; body?: unknown };

// One place for every call to the server: builds the request, and turns failures into an Error
// with a message we can show on screen (like the server's "Not enough balance")
export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only throws when it couldn't reach the server at all
    throw new Error(`Can't reach the server at ${API_URL}. Is it running, and on the same Wi-Fi?`);
  }

  if (response.status === 204) return undefined as T; // success, nothing sent back

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `The server answered with an error (${response.status})`);
  }
  return data as T;
}
