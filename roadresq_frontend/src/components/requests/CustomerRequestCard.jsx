import { useState } from 'react';
import { CalendarClock, Car, ChevronDown, FileText, Gauge, MapPin, Phone } from 'lucide-react';
import { StatusBadge, UrgencyBadge } from '../ui/Badge';
import StatusTimeline from '../ui/StatusTimeline';
import { DetailRow, PersonCard, ServiceIcon } from './RequestBits';
import LiveTrackingPanel from './LiveTrackingPanel';
import { STATUS_META, isActiveJob, serviceMeta } from '../../utils/status';
import { formatCoords, formatDateTime, parseLocation, shortId } from '../../utils/format';

// A customer's request: summary, timeline, mechanic, live tracking, details.
const CustomerRequestCard = ({ request, defaultExpanded = false, featured = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const service = serviceMeta(request.serviceType);
  const active = isActiveJob(request.status);
  const pos = parseLocation(request.location);
  const showTracking = request.status !== 'resolved';

  return (
    <article className={`card overflow-hidden animate-slide-up ${featured ? 'ring-1 ring-signal-200' : ''}`}>
      <header className="flex flex-wrap items-start gap-4 p-5">
        <ServiceIcon serviceType={request.serviceType} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink-950">{service.label}</h3>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-0.5 text-sm text-ink-500">
            <span className="font-mono text-xs text-ink-400">{shortId(request._id)}</span> · {request.vehicleType} ·{' '}
            {formatDateTime(request.createdAt)}
          </p>
          <p className="mt-2 text-sm font-medium text-ink-700">{STATUS_META[request.status]?.label}</p>
        </div>
      </header>

      <div className="border-t border-ink-100 px-5 py-5">
        <StatusTimeline request={request} />
      </div>

      {request.mechanicId && (
        <div className="px-5 pb-5">
          <PersonCard person={request.mechanicId} role="Mechanic" chatTo={active ? `/chat?request=${request._id}` : null} />
        </div>
      )}

      {showTracking && (expanded || featured) && (
        <div className="px-5 pb-5">
          <LiveTrackingPanel request={request} />
        </div>
      )}

      {expanded && (
        <div className="grid gap-4 border-t border-ink-100 bg-ink-50/40 px-5 py-5 sm:grid-cols-2 animate-fade-in">
          <DetailRow icon={FileText} label="Problem description">
            <p className="whitespace-pre-line break-words">{request.description}</p>
          </DetailRow>
          <DetailRow icon={Car} label="Vehicle">{request.vehicleType}</DetailRow>
          <DetailRow icon={Gauge} label="Urgency"><UrgencyBadge urgency={request.urgency} /></DetailRow>
          <DetailRow icon={MapPin} label="Location">
            <span className="font-mono text-xs">{pos ? formatCoords(pos) : request.location}</span>
          </DetailRow>
          <DetailRow icon={Phone} label="Contact number shared with mechanic">{request.phone}</DetailRow>
          <DetailRow icon={CalendarClock} label="Requested">{formatDateTime(request.createdAt)}</DetailRow>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-ink-100 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50"
        aria-expanded={expanded}
      >
        {expanded ? 'Hide details' : showTracking && !featured ? 'Details & live map' : 'Show details'}
        <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </button>
    </article>
  );
};

export default CustomerRequestCard;
