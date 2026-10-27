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

type RequestOptions = { method?: "GET" | "POST" | "PATCH"; body?: unknown };

// One place for every call to the server: adds the sign-in ticket, builds the request, and turns
// failures into an error we can show on screen (like the server's "Not enough balance")
export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
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
    });
  } catch {
    // fetch only throws when it couldn't reach the server at all
    throw new Error(`Can't reach the server at ${API_URL}. Is it running, and on the same Wi-Fi?`);
  }

  if (response.status === 204) return undefined as T; // success, nothing sent back

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error ?? `The server answered with an error (${response.status})`, response.status, data?.code);
  }
  return data as T;
}
