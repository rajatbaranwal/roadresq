// In-memory chat history per help request (kept while the app is open,
// so messages that arrive while the chat page is closed are not lost).
// Messages are not persisted on the server; a page refresh clears them.
import socket from "./socket";

const EMPTY = [];
const byRequest = new Map();
const listeners = new Set();

const notify = () => listeners.forEach((l) => l());

const setMessages = (requestId, messages) => {
  byRequest.set(requestId, messages);
  notify();
};

export const getMessages = (requestId) => byRequest.get(requestId) ?? EMPTY;

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const addMessage = (requestId, message) => {
  setMessages(requestId, [...getMessages(requestId), message]);
};

export const updateMessage = (requestId, localId, patch) => {
  setMessages(
    requestId,
    getMessages(requestId).map((m) => (m.localId === localId ? { ...m, ...patch } : m))
  );
};

export const clearMessages = () => {
  byRequest.clear();
  notify();
};

let localSeq = 0;
export const nextLocalId = () => `local-${Date.now()}-${++localSeq}`;

// One global listener for the app's lifetime
socket.on("receiveMessage", (msg) => {
  if (!msg?.requestId) return;
  addMessage(msg.requestId, { ...msg, localId: nextLocalId(), status: "sent" });
});
