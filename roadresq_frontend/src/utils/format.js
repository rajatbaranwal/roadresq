export const shortId = (id) => `#${String(id ?? '').slice(-6).toUpperCase()}`;

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';

export const timeAgo = (value, now = Date.now()) => {
  if (!value) return '';
  const s = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return formatDateTime(value);
};

export const greeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';

// Requests store location as "lat,lng"
export const parseLocation = (value) => {
  if (typeof value !== 'string') return null;
  const [lat, lng] = value.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

export const formatCoords = (pos) => (pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : '');

// Great-circle (straight-line) distance in km — not a road distance or ETA
export const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const formatDistance = (km) =>
  km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;

export const directionsUrl = (pos) =>
  pos ? `https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}` : null;
