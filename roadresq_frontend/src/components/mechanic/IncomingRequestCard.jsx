import { Car, Check, Clock, ExternalLink, MapPin, X } from 'lucide-react';
import Button from '../ui/Button';
import { Badge, UrgencyBadge } from '../ui/Badge';
import { Avatar } from '../ui/Misc';
import { ServiceIcon } from '../requests/RequestBits';
import { serviceMeta } from '../../utils/status';
import { formatCoords, parseLocation, timeAgo } from '../../utils/format';

const mapsSearchUrl = (pos) => `https://www.google.com/maps/search/?api=1&query=${pos[0]},${pos[1]}`;

// An open request waiting for a mechanic. Contact details are hidden until accepted.
const IncomingRequestCard = ({ request, isNew, now, busy, onAccept, onDecline }) => {
  const service = serviceMeta(request.serviceType);
  const pos = parseLocation(request.location);
  const high = request.urgency === 'High';

  return (
    <article
      className={`card relative flex flex-col overflow-hidden animate-slide-up ${isNew ? 'animate-new-ring ring-2 ring-signal-400' : ''}`}
    >
      {high && <span className="absolute inset-y-0 left-0 w-1 bg-signal-500" aria-hidden />}
      <div className="flex items-start gap-3 p-5 pb-4">
        <ServiceIcon serviceType={request.serviceType} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-950">{service.label}</h3>
            {isNew && <Badge tone="signal">New</Badge>}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            <Clock size={12} aria-hidden /> {timeAgo(request.createdAt, now)}
          </p>
        </div>
        <UrgencyBadge urgency={request.urgency} />
      </div>

      <div className="flex-1 space-y-3 px-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={request.userId?.name} size="sm" tone="signal" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{request.userId?.name ?? 'Customer'}</p>
            <p className="flex items-center gap-1 text-xs text-ink-500">
              <Car size={12} aria-hidden /> {request.vehicleType}
            </p>
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-ink-700">{request.description}</p>
        {pos && (
          <a
            href={mapsSearchUrl(pos)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-signal-600"
          >
            <MapPin size={13} className="text-signal-500" aria-hidden />
            <span className="font-mono">{formatCoords(pos)}</span>
            <ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>

      <div className="flex gap-2 border-t border-ink-100 p-3">
        <Button onClick={onAccept} loading={busy === 'accept'} disabled={Boolean(busy)} icon={Check} className="flex-1">
          Accept
        </Button>
        <Button onClick={onDecline} variant="ghost" loading={busy === 'decline'} disabled={Boolean(busy)} icon={X}>
          Decline
        </Button>
      </div>
    </article>
  );
};

export default IncomingRequestCard;
