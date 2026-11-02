import { Navigation, RadioTower, SignalLow, WifiOff } from 'lucide-react';
import TrackingMap from '../map/TrackingMap';
import { useMechanicLocation, useNow } from '../../hooks/useLocation';
import { useSocketConnected } from '../../hooks/useSocket';
import { isActiveJob } from '../../utils/status';
import { distanceKm, formatDistance, parseLocation, timeAgo } from '../../utils/format';

const LIVE_MS = 30 * 1000;
const STALE_MS = 2 * 60 * 1000;

// Customer view of the assigned mechanic's real, shared position.
// Shows nothing invented: no ETA, only real updates and their age.
const LiveTrackingPanel = ({ request, mapClassName = 'h-64 sm:h-72' }) => {
  const customerPos = parseLocation(request.location);
  const active = isActiveJob(request.status) && Boolean(request.mechanicId);
  const { location, stopped } = useMechanicLocation(request._id, active);
  const connected = useSocketConnected();
  const now = useNow(5000);

  const mechanicName = request.mechanicId?.name ?? 'Your mechanic';
  const age = location ? now - Date.parse(location.updatedAt) : null;
  const distance = location && customerPos ? distanceKm([location.lat, location.lng], customerPos) : null;

  let tone = 'neutral';
  let icon = RadioTower;
  let text;
  if (!connected) {
    tone = 'warning';
    icon = WifiOff;
    text = 'Reconnecting to live updates…';
  } else if (!active) {
    text = request.status === 'resolved' ? 'This request is resolved. Tracking has ended.' : 'Live tracking starts once a mechanic accepts your request.';
  } else if (stopped) {
    tone = 'warning';
    icon = SignalLow;
    text = `${mechanicName} stopped sharing their location${location ? ` · last update ${timeAgo(location.updatedAt, now)}` : ''}.`;
  } else if (!location) {
    text = `Waiting for ${mechanicName} to share their live location.`;
  } else if (age < LIVE_MS) {
    tone = 'live';
    text = `Live · updated ${timeAgo(location.updatedAt, now)}`;
  } else if (age < STALE_MS) {
    text = `Last update ${timeAgo(location.updatedAt, now)}`;
  } else {
    tone = 'warning';
    icon = SignalLow;
    text = `Signal lost · last seen ${timeAgo(location.updatedAt, now)}`;
  }

  const tones = {
    neutral: 'bg-ink-50 text-ink-600',
    warning: 'bg-amber-50 text-amber-800',
    live: 'bg-volt-50 text-volt-700',
  };
  const Icon = icon;

  return (
    <div className="space-y-3">
      <TrackingMap
        customer={customerPos}
        mechanic={active ? location : null}
        className={mapClassName}
        customerLabel="Your location"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${tones[tone]}`} role="status">
          {tone === 'live' ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt-400 opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-volt-500" />
            </span>
          ) : (
            <Icon size={14} aria-hidden />
          )}
          {text}
        </p>
        {distance != null && (
          <p className="inline-flex items-center gap-1.5 text-xs text-ink-500" title="Straight-line distance, not road distance">
            <Navigation size={13} aria-hidden /> {formatDistance(distance)} away · straight line
          </p>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingPanel;
