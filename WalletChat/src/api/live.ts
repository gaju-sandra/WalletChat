import { AppState } from "react-native";
import { API_URL } from "@/api/client";

// The live line to the server (see server/src/live.ts). Same computer and port as the API, but
// "ws://" instead of "http://": a WebSocket, which stays open so the server can speak first.
const LIVE_URL = `${API_URL.replace(/^http/, "ws")}/live`; // http→ws, https→wss

const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000]; // wait longer after each failed try, up to 30 s

// Opens the line and keeps it open: if it drops (Wi-Fi ↔ mobile data, server restart, phone asleep),
// it connects again by itself. onChange runs when the server says your data changed, and after every
// reconnect too, in case something happened while the line was down.
// Returns a function that closes the line for good (when you sign out).
export function connectLive(getToken: () => Promise<string | null>, onChange: () => void) {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let stopped = false;
  let connectedBefore = false;

  async function open() {
    clearTimeout(retryTimer);
    if (stopped || socket) return;

    const token = await getToken();
    if (stopped || !token) return;

    const line = new WebSocket(LIVE_URL);
    socket = line;
    // First thing on the line: who I am. The server closes it if the token isn't valid.
    line.onopen = () => line.send(JSON.stringify({ type: "hello", token }));
    line.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as { type: string };
      if (message.type === "ready") {
        failures = 0;
        if (connectedBefore) onChange(); // back after a break: catch up on anything missed
        connectedBefore = true;
      }
      if (message.type === "changed") onChange();
    };
    line.onclose = () => {
      if (socket === line) socket = null;
      if (stopped) return;
      retryTimer = setTimeout(open, RETRY_MS[Math.min(failures, RETRY_MS.length - 1)]);
      failures++;
    };
  }

  // Phones pause apps in the background, which often kills the line without a "close". When you come
  // back to the app, start a fresh line straight away instead of waiting for the retry timer.
  const appState = AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    failures = 0;
    if (socket?.readyState === WebSocket.OPEN) return;
    socket?.close();
    socket = null;
    open();
  });

  open();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    appState.remove();
    socket?.close();
    socket = null;
  };
}
