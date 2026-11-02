// Mechanic live-location sharing for one active job at a time.
// Uses the browser's real GPS position (watchPosition) and sends it over the
// authenticated socket, throttled. Lives outside React so it keeps running
// while the mechanic moves between pages; stops on logout or when the job ends.
import socket from '../socket';

const SEND_INTERVAL_MS = 4000; // server accepts at most one update per 2 s
const MIN_MOVE_METERS = 10; // skip sends when standing still (heartbeat below)
const HEARTBEAT_MS = 20000; // still send occasionally so "last updated" stays fresh

const initial = { requestId: null, status: 'idle', error: null, position: null, lastSentAt: null };
let state = initial;
let watchId = null;
let timer = null;
let lastSent = null; // { lat, lng, at }
const listeners = new Set();

const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const getLocationShareState = () => state;
export const subscribeLocationShare = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const metersBetween = (a, b) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const send = () => {
  timer = null;
  const pos = state.position;
  if (!pos || !state.requestId || !socket.connected) return;

  socket.emit('location:update', { requestId: state.requestId, ...pos }, (res) => {
    if (res?.ok) {
      lastSent = { lat: pos.lat, lng: pos.lng, at: Date.now() };
      if (state.status !== 'sharing' || state.error) setState({ status: 'sharing', error: null });
      setState({ lastSentAt: res.updatedAt });
    } else if (res?.error === 'throttled') {
      schedule();
    } else if (res?.error) {
      // Job no longer active / not ours: stop for good
      stopSharing({ notifyServer: false, error: res.error });
    }
  });
};

const schedule = () => {
  if (timer) return;
  const since = lastSent ? Date.now() - lastSent.at : Infinity;
  timer = setTimeout(send, Math.max(0, SEND_INTERVAL_MS - since));
};

const onPosition = (p) => {
  const position = {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy: Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : undefined,
    heading: Number.isFinite(p.coords.heading) ? p.coords.heading : undefined,
    speed: Number.isFinite(p.coords.speed) ? p.coords.speed : undefined,
  };
  setState({ position, status: state.status === 'requesting' ? 'sharing' : state.status, error: null });

  const moved = !lastSent || metersBetween(lastSent, position) >= MIN_MOVE_METERS;
  const stale = !lastSent || Date.now() - lastSent.at >= HEARTBEAT_MS;
  if (moved || stale) schedule();
};

const onError = (err) => {
  const messages = {
    1: 'Location permission was denied. Allow location access in your browser settings to share it.',
    2: 'Your location is currently unavailable. Check GPS or network.',
    3: 'Getting your location timed out. Still trying…',
  };
  if (err.code === 1) {
    stopSharing({ error: messages[1] });
  } else {
    setState({ error: messages[err.code] ?? err.message });
  }
};

// Resend right away after a reconnect so the customer is up to date
socket.on('connect', () => {
  if (state.requestId && state.position) {
    lastSent = null;
    schedule();
  }
});

// The job ended (resolved) while sharing: stop automatically
socket.on('status-update', ({ requestId, newStatus }) => {
  if (requestId === state.requestId && !['accepted', 'in-progress'].includes(newStatus)) {
    stopSharing({ notifyServer: false });
  }
});

// Must be called from a user gesture: it triggers the browser permission prompt.
export const startSharing = (requestId) => {
  if (!('geolocation' in navigator)) {
    setState({ ...initial, status: 'error', error: 'This browser does not support location sharing.' });
    return;
  }
  if (state.requestId && state.requestId !== requestId) stopSharing();
  if (watchId != null) return;

  lastSent = null;
  setState({ ...initial, requestId, status: 'requesting' });
  watchId = navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 20000,
  });
};

export function stopSharing({ notifyServer = true, error = null } = {}) {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  clearTimeout(timer);
  timer = null;
  const { requestId } = state;
  if (notifyServer && requestId && socket.connected) socket.emit('location:stop', { requestId }, () => {});
  lastSent = null;
  setState({ ...initial, status: error ? 'error' : 'idle', error, requestId: error ? requestId : null });
}
