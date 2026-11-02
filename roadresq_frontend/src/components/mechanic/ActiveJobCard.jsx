import { useEffect, useState } from 'react';
import { Car, CheckCircle2, FileText, Gauge, Navigation, Play, Radio, Square, TriangleAlert } from 'lucide-react';
import Button from '../ui/Button';
import { StatusBadge, UrgencyBadge } from '../ui/Badge';
import StatusTimeline from '../ui/StatusTimeline';
import TrackingMap from '../map/TrackingMap';
import { DetailRow, PersonCard, ServiceIcon } from '../requests/RequestBits';
import { useLocationShare, useNow } from '../../hooks/useLocation';
import { startSharing, stopSharing } from '../../services/locationShare';
import { serviceMeta } from '../../utils/status';
import { directionsUrl, distanceKm, formatDistance, parseLocation, shortId, timeAgo } from '../../utils/format';

const NEXT_STEP = {
  accepted: { status: 'in-progress', label: 'Start job', icon: Play, variant: 'dark' },
  'in-progress': { status: 'resolved', label: 'Mark as resolved', icon: CheckCircle2, variant: 'success', confirm: true },
};

const LocationShareControl = ({ requestId }) => {
  const share = useLocationShare();
  const now = useNow(3000);
  const mine = share.requestId === requestId;
  const sharing = mine && (share.status === 'sharing' || share.status === 'requesting');

  return (
    <div className={`rounded-2xl border p-4 ${sharing ? 'border-volt-300 bg-volt-50/60' : 'border-ink-100 bg-ink-50/60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${sharing ? 'bg-volt-400 text-ink-950' : 'bg-white text-ink-500'}`}>
            <Radio size={18} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {share.status === 'requesting' && mine
                ? 'Waiting for location permission…'
                : sharing
                  ? 'Sharing live location'
                  : 'Live location is off'}
            </p>
            <p className="text-xs text-ink-500">
              {sharing && share.lastSentAt
                ? `Customer sees you on their map · last sent ${timeAgo(share.lastSentAt, now)}`
                : sharing
                  ? 'Getting your GPS position…'
                  : 'Only this customer can see it, and it stops when the job is resolved.'}
            </p>
          </div>
        </div>
        {sharing ? (
          <Button size="sm" variant="outline" icon={Square} onClick={() => stopSharing()}>
            Stop
          </Button>
        ) : (
          <Button size="sm" variant="dark" icon={Radio} onClick={() => startSharing(requestId)}>
            Share location
          </Button>
        )}
      </div>
      {mine && share.error && (
        <p className="mt-3 flex items-start gap-2 text-xs text-amber-800">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {share.error}
        </p>
      )}
    </div>
  );
};

// The mechanic's view of an accepted job: map, customer, controls.
const ActiveJobCard = ({ request, busy, onAdvance }) => {
  const [confirming, setConfirming] = useState(false);
  const share = useLocationShare();
  const customerPos = parseLocation(request.location);
  const self = share.requestId === request._id ? share.position : null;
  const distance = self && customerPos ? distanceKm([self.lat, self.lng], customerPos) : null;
  const next = NEXT_STEP[request.status];
  const service = serviceMeta(request.serviceType);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const advance = () => {
    if (next.confirm && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onAdvance(request._id, next.status);
  };

  return (
    <article className="card overflow-hidden animate-slide-up">
      <header className="flex flex-wrap items-center gap-3 bg-ink-950 px-5 py-4 text-white">
        <ServiceIcon serviceType={request.serviceType} dark />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-400">
            Active job · <span className="font-mono">{shortId(request._id)}</span>
          </p>
          <h3 className="truncate text-lg font-semibold">{service.label}</h3>
        </div>
        <StatusBadge status={request.status} />
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <TrackingMap customer={customerPos} self={self} className="h-64 sm:h-80" customerLabel="Customer location" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {customerPos && (
              <Button href={directionsUrl(customerPos)} target="_blank" rel="noreferrer" variant="primary" icon={Navigation}>
                Navigate
              </Button>
            )}
            {distance != null && (
              <p className="text-xs text-ink-500" title="Straight-line distance, not road distance">
                {formatDistance(distance)} away · straight line
              </p>
            )}
          </div>
          <LocationShareControl requestId={request._id} />
        </div>

        <div className="space-y-5">
          <PersonCard person={request.userId} role="Customer" chatTo={`/chat?request=${request._id}`} />

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow icon={Car} label="Vehicle">{request.vehicleType}</DetailRow>
            <DetailRow icon={Gauge} label="Urgency"><UrgencyBadge urgency={request.urgency} /></DetailRow>
            <div className="sm:col-span-2">
              <DetailRow icon={FileText} label="Problem">
                <p className="whitespace-pre-line break-words">{request.description}</p>
              </DetailRow>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 p-4">
            <StatusTimeline request={request} orientation="vertical" />
          </div>

          {next && (
            <Button
              onClick={advance}
              variant={confirming ? 'primary' : next.variant}
              size="lg"
              full
              icon={next.icon}
              loading={busy}
            >
              {confirming ? 'Tap again to confirm' : next.label}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ActiveJobCard;
