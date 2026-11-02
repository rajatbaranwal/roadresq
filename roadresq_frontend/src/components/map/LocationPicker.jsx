import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, Loader2, MapPin, MousePointerClick } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { customerIcon, FALLBACK_CENTER, TILE_ATTRIBUTION, TILE_URL } from './mapIcons';
import { formatCoords } from '../../utils/format';

const FlyTo = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), zoom), { duration: 0.6 });
  }, [position, zoom, map]);
  return null;
};

const ClickToSelect = ({ onSelect }) => {
  useMapEvents({ click: (e) => onSelect([e.latlng.lat, e.latlng.lng]) });
  return null;
};

const GEO_ERRORS = {
  1: 'Location access was denied. Tap the map to set your position.',
  2: 'Your position is unavailable right now. Tap the map to set it.',
  3: 'Locating took too long. Try again or tap the map.',
};

// Controlled map picker: value = [lat, lng] | null, onChange([lat, lng])
const LocationPicker = ({ value, onChange }) => {
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setError('Your browser cannot detect location. Tap the map to set it.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setAccuracy(Math.round(pos.coords.accuracy));
        setFlyTarget(p);
        onChangeRef.current(p);
        setLocating(false);
      },
      (err) => {
        setError(GEO_ERRORS[err.code] ?? err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  // If permission was already granted, locate immediately (no prompt is shown)
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted' && !value) locate();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (p) => {
    setAccuracy(null);
    onChange(p);
  };

  const markerHandlers = useMemo(
    () => ({
      dragend: (e) => {
        const { lat, lng } = e.target.getLatLng();
        setAccuracy(null);
        onChangeRef.current([lat, lng]);
      },
    }),
    []
  );

  return (
    <div className="space-y-3">
      <div className="relative isolate h-64 overflow-hidden rounded-2xl border border-ink-100 bg-ink-50 sm:h-80">
        <MapContainer center={value ?? FALLBACK_CENTER} zoom={value ? 15 : 5} className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <FlyTo position={flyTarget} zoom={15} />
          <ClickToSelect onSelect={select} />
          {value && (
            <>
              {accuracy > 0 && (
                <Circle center={value} radius={accuracy} pathOptions={{ color: '#FF6A1A', weight: 1, fillOpacity: 0.08 }} />
              )}
              <Marker position={value} icon={customerIcon} draggable eventHandlers={markerHandlers} />
            </>
          )}
        </MapContainer>

        {!value && !locating && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-950/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <MousePointerClick size={14} /> Tap the map to drop a pin
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="btn btn-md btn-dark w-full sm:w-auto"
        >
          {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
          {locating ? 'Locating…' : value ? 'Use my current location again' : 'Use my current location'}
        </button>
        {value && (
          <p className="flex items-center gap-1.5 text-sm text-ink-500">
            <MapPin size={15} className="text-signal-500" />
            <span className="font-mono text-xs">{formatCoords(value)}</span>
            {accuracy ? <span className="text-xs">· ±{accuracy} m</span> : <span className="text-xs">· set on map</span>}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-amber-700">{error}</p>}
      {value && <p className="text-xs text-ink-400">Drag the pin or tap the map to fine-tune the exact spot.</p>}
    </div>
  );
};

export default LocationPicker;
