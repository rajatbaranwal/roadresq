import L from 'leaflet';

// Created once and reused: markers only ever move (setLatLng), never re-created.
export const customerIcon = L.divIcon({
  className: 'rq-marker',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  popupAnchor: [0, -38],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
    <ellipse cx="17" cy="41" rx="7" ry="2.5" fill="rgba(8,13,25,.25)"/>
    <path d="M17 2C9 2 2.5 8.3 2.5 16.2 2.5 27 17 40 17 40s14.5-13 14.5-23.8C31.5 8.3 25 2 17 2z" fill="#FF6A1A" stroke="#fff" stroke-width="2.5"/>
    <circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>`,
});

export const mechanicIcon = L.divIcon({
  className: 'rq-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -18],
  html: `<div style="position:relative;width:40px;height:40px">
    <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(181,227,31,.28)"></span>
    <span style="position:absolute;inset:5px;border-radius:9999px;background:#0E1525;border:2.5px solid #B5E31F;display:grid;place-items:center;box-shadow:0 4px 12px rgba(8,13,25,.35)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B5E31F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </span></div>`,
});

// The current user's own GPS position (e.g. mechanic while sharing)
export const selfIcon = L.divIcon({
  className: 'rq-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.2),0 2px 6px rgba(0,0,0,.3)"></span>`,
});

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Shown when no position is known yet, so the user can still pick a point
export const FALLBACK_CENTER = [20.5937, 78.9629];
