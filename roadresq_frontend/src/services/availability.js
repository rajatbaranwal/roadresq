// Mechanic availability for new-request alerts. The server puts every mechanic
// in the alerts room on (re)connect, so a "paused" choice is re-applied on connect.
import socket from '../socket';

const KEY = 'rq:available';
const read = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

let available = read();
const listeners = new Set();

const apply = () => {
  if (socket.connected) socket.emit('mechanic:availability', { available }, () => {});
};

socket.on('connect', () => {
  if (!available) apply();
});

export const getAvailable = () => available;
export const subscribeAvailable = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const setAvailable = (value) => {
  available = value;
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off');
  } catch {
    /* storage unavailable: applies to this session only */
  }
  apply();
  listeners.forEach((l) => l());
};
