import { STATUS_META } from '../../utils/status';

const TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  signal: 'bg-signal-100 text-signal-700',
  info: 'bg-sky-100 text-sky-800',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-volt-100 text-volt-700',
  danger: 'bg-red-100 text-red-700',
  dark: 'bg-ink-800 text-ink-100',
};

export const Badge = ({ tone = 'neutral', icon: Icon, className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${TONES[tone]} ${className}`}
  >
    {Icon && <Icon size={13} aria-hidden />}
    {children}
  </span>
);

// Re-keyed on status change so the pop animation plays on live updates
export const StatusBadge = ({ status, className = '' }) => {
  const meta = STATUS_META[status] ?? { short: status, tone: 'neutral' };
  return (
    <Badge key={status} tone={meta.tone} className={`animate-pop ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {meta.short}
    </Badge>
  );
};

const URGENCY_TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' };
export const UrgencyBadge = ({ urgency }) => (
  <Badge tone={URGENCY_TONE[urgency] ?? 'neutral'}>{urgency ?? 'Medium'} urgency</Badge>
);
