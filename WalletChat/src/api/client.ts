import Constants from "expo-constants";

// While developing, the phone already knows your computer's address: it's where it downloaded the app's
// code from (Metro, e.g. "172.20.10.4:8081"). The server runs on that same computer, on port 3000.
// So when your Wi-Fi address changes, the app follows automatically.
function devServerUrl() {
  const host = Constants.expoConfig?.hostUri?.split(":")[0]; // "172.20.10.4:8081" → "172.20.10.4"
  return host ? `http://${host}:3000` : undefined;
}

// Where the WalletChat server runs. EXPO_PUBLIC_API_URL in WalletChat/.env.local can override it
// (it must be read exactly like this, with dot notation, for Expo to fill it in)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? devServerUrl() ?? "http://localhost:3000";

// An error from the server, with its status (401, 404…) and code ("profile_missing"…) kept, so the app
// can react to specific cases instead of only showing the message
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

// How to get the signed-in person's ticket (Clerk session token). The wallet context sets this with
// Clerk's getToken once you are signed in, so every request below can carry the ticket.
type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter = async () => null;

export function setTokenGetter(getter: TokenGetter) {
  getToken = getter;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  timeoutMs?: number; // give up after this long (photo uploads need more time)
};

// Without a limit, a request to a server that never answers can wait for minutes, with a spinner turning
const DEFAULT_TIMEOUT_MS = 10_000;

// One place for every call to the server: adds the sign-in ticket, builds the request, and turns
// failures into an error we can show on screen (like the server's "Not enough balance")
export async function api<T>(
  path: string,
  { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {},
): Promise<T> {
  const token = await getToken(); // a fresh ticket: Clerk renews it before it expires
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs), // cancels the request when the time is up
    });
  } catch (error) {
    // fetch only throws when it got no answer at all: the time ran out, or the server can't be reached.
    // React Native's fetch calls a cancelled request "AbortError" (browsers say "TimeoutError").
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      throw new Error(`The server at ${API_URL} isn't answering. Check it's running, then try again.`);
    }
    throw new Error(`Can't reach the server at ${API_URL}. Is it running, and on the same Wi-Fi?`);
  }

  if (response.status === 204) return undefined as T; // success, nothing sent back

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error ?? `The server answered with an error (${response.status})`, response.status, data?.code);
  }
  return data as T;
}
