import { AppState } from "react-native";
import { API_URL } from "@/api/client";

// The live line to the server (see server/src/live.ts). Same computer and port as the API, but
// "ws://" instead of "http://": a WebSocket, which stays open so the server can speak first.
const LIVE_URL = `${API_URL.replace(/^http/, "ws")}/live`; // http→ws, https→wss

const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000]; // wait longer after each failed try, up to 30 s

type LiveHandlers = {
  onChange: () => void; // your data changed (and after every reconnect, to catch up)
  onTyping: (fromUserId: string, typing: boolean) => void; // someone started or stopped typing to you
};

// Opens the line and keeps it open: if it drops (Wi-Fi ↔ mobile data, server restart, phone asleep),
// it connects again by itself, then calls onChange in case something happened while it was down.
// Returns close() (closes the line for good, when you sign out) and sendTyping().
export function connectLive(getToken: () => Promise<string | null>, { onChange, onTyping }: LiveHandlers) {
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
      const message = JSON.parse(String(event.data)) as { type: string; from?: number; typing?: boolean };
      if (message.type === "ready") {
        failures = 0;
        if (connectedBefore) onChange(); // back after a break: catch up on anything missed
        connectedBefore = true;
      }
      if (message.type === "changed") onChange();
      if (message.type === "typing" && message.from) onTyping(String(message.from), message.typing !== false);
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

  return {
    close() {
      stopped = true;
      clearTimeout(retryTimer);
      appState.remove();
      socket?.close();
      socket = null;
    },
    // Tell contactId I'm typing (or stopped). Dropped if the line is down: it's only a hint.
    sendTyping(contactId: string, typing: boolean) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "typing", to: Number(contactId), typing }));
      }
    },
  };
}
