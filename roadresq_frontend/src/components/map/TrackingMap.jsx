import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { customerIcon, mechanicIcon, selfIcon, TILE_ATTRIBUTION, TILE_URL, FALLBACK_CENTER } from './mapIcons';

// Fits the view to all known points once, and again when a new kind of point appears
// (e.g. the mechanic's first location). Later movements only move the marker.
const AutoFit = ({ points, fitKey }) => {
  const map = useMap();
  const lastKey = useRef(null);

  useEffect(() => {
    if (fitKey === lastKey.current || points.length === 0) return;
    lastKey.current = fitKey;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
  }, [fitKey, points, map]);

  return null;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Glides the SAME Leaflet marker to each new position (no re-creation)
const AnimatedMarker = ({ lat, lng, icon, children }) => {
  const markerRef = useRef(null);
  const [initial] = useState(() => [lat, lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const from = marker.getLatLng();
    const to = L.latLng(lat, lng);
    if (from.equals(to)) return;
    if (prefersReducedMotion()) {
      marker.setLatLng(to);
      return;
    }
    let raf;
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / 800);
      const e = 1 - (1 - k) ** 3;
      marker.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [lat, lng]);

  return (
    <Marker ref={markerRef} position={initial} icon={icon}>
      {children}
    </Marker>
  );
};

const RecenterButton = ({ points }) => {
  const map = useMap();
  if (points.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => (points.length === 1 ? map.setView(points[0], 15) : map.fitBounds(points, { padding: [48, 48], maxZoom: 16 }))}
      className="absolute bottom-3 right-3 z-[400] grid h-10 w-10 place-items-center rounded-xl bg-white text-ink-700 shadow-lift hover:bg-ink-50"
      aria-label="Recenter map"
      title="Recenter"
    >
      <LocateFixed size={18} />
    </button>
  );
};

// customer: [lat, lng] of the request; mechanic: live {lat,lng,accuracy}; self: own {lat,lng,accuracy}
const TrackingMap = ({ customer, mechanic, self, className = 'h-72', customerLabel = 'Assistance location' }) => {
  const mechanicPos = mechanic ? [mechanic.lat, mechanic.lng] : null;
  const selfPos = self ? [self.lat, self.lng] : null;
  const points = [customer, mechanicPos, selfPos].filter(Boolean);
  const fitKey = `${Boolean(customer)}-${Boolean(mechanicPos)}-${Boolean(selfPos)}`;

  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-ink-100 bg-ink-50 ${className}`}>
      <MapContainer
        center={points[0] ?? FALLBACK_CENTER}
        zoom={points.length ? 14 : 5}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <AutoFit points={points} fitKey={fitKey} />

        {customer && (
          <Marker position={customer} icon={customerIcon}>
            <Popup>{customerLabel}</Popup>
          </Marker>
        )}

        {mechanicPos && (
          <>
            {mechanic.accuracy > 0 && (
              <Circle
                center={mechanicPos}
                radius={mechanic.accuracy}
                pathOptions={{ color: '#98C70E', weight: 1, fillColor: '#B5E31F', fillOpacity: 0.12 }}
              />
            )}
            <AnimatedMarker lat={mechanic.lat} lng={mechanic.lng} icon={mechanicIcon}>
              <Popup>Mechanic</Popup>
            </AnimatedMarker>
          </>
        )}

        {selfPos && (
          <>
            {self.accuracy > 0 && (
              <Circle
                center={selfPos}
                radius={self.accuracy}
                pathOptions={{ color: '#2563EB', weight: 1, fillColor: '#3B82F6', fillOpacity: 0.1 }}
              />
            )}
            <Marker position={selfPos} icon={selfIcon}>
              <Popup>You</Popup>
            </Marker>
          </>
        )}

        <RecenterButton points={points} />
      </MapContainer>
    </div>
  );
};

export default TrackingMap;
