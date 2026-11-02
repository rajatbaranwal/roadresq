import { io } from "socket.io-client";

// Empty in dev => same origin, proxied to the backend by Vite (see vite.config.js).
// Set VITE_SOCKET_URL for production builds (see .env.production).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_SOCKET_DEBUG === "1";

const log = (...args) => DEBUG && console.log("[socket]", ...args);

const options = {
  autoConnect: false, // connected explicitly after login (see AuthContext)
  withCredentials: true,
  transports: ["websocket", "polling"], // websocket first, polling as fallback
  // Called on every (re)connection attempt, so a fresh token is always sent
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
};

// Single shared instance for the whole app: prevents duplicate connections
const socket = SOCKET_URL ? io(SOCKET_URL, options) : io(options);

socket.on("connect", () => {
  log(`connected id=${socket.id} transport=${socket.io.engine.transport.name} recovered=${socket.recovered}`);
});

socket.on("connect_error", (err) => {
  if (!socket.active) {
    // Server middleware rejected us (bad/expired token): the client will not retry
    console.warn("[socket] authentication rejected:", err.message);
    window.dispatchEvent(new Event("auth:expired"));
  } else {
    // Network/server problem: socket.io keeps retrying with backoff
    console.warn("[socket] connection error, retrying:", err.message);
  }
});

socket.on("disconnect", (reason) => {
  log("disconnected:", reason);
  // The server kicked us out; socket.io does not auto-reconnect in that case
  if (reason === "io server disconnect") socket.connect();
});

socket.io.on("reconnect_attempt", (attempt) => log("reconnect attempt", attempt));

if (DEBUG) {
  socket.onAny((event, ...args) => log(`event "${event}"`, args[0]));
}

export const connectSocket = () => {
  // `active` is true while connected or (re)connecting: avoids duplicate connects
  if (!socket.active) socket.connect();
};

export const disconnectSocket = () => {
  if (socket.active || socket.connected) socket.disconnect();
};

export default socket;
