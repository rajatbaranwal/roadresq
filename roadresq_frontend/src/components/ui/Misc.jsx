// Small presentational building blocks
import { useSocketConnected } from '../../hooks/useSocket';

export const Avatar = ({ name = '', size = 'md', tone = 'dark' }) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };
  const tones = {
    dark: 'bg-ink-800 text-white',
    signal: 'bg-signal-100 text-signal-700',
    volt: 'bg-volt-200 text-ink-900',
  };
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${sizes[size]} ${tones[tone]}`} aria-hidden>
      {initials}
    </span>
  );
};

// Live socket connection indicator
export const ConnectionStatus = ({ dark = false, showLabel = true }) => {
  const connected = useSocketConnected();
  const label = connected ? 'Live' : 'Reconnecting';
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-medium ${dark ? 'text-ink-200' : 'text-ink-500'}`}
      title={connected ? 'Real-time updates connected' : 'Real-time updates disconnected, reconnecting…'}
      role="status"
    >
      <span className="relative flex h-2.5 w-2.5">
        {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt-400 opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-volt-400' : 'bg-amber-400'}`} />
      </span>
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
};

export const StatTile = ({ label, value, icon: Icon, accent = 'ink', loading = false }) => {
  const accents = {
    ink: 'bg-white/10 text-white',
    signal: 'bg-signal-500/15 text-signal-300',
    volt: 'bg-volt-400/15 text-volt-300',
    sky: 'bg-sky-400/15 text-sky-300',
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-300">{label}</span>
        {Icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${accents[accent]}`}>
            <Icon size={16} aria-hidden />
          </span>
        )}
      </div>
      <p key={value} className="mt-2 font-display text-3xl font-semibold text-white animate-pop">
        {loading ? <span className="inline-block h-8 w-10 animate-pulse rounded bg-white/10 align-middle" /> : value}
      </p>
    </div>
  );
};

export const Switch = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
      checked ? 'bg-volt-400' : 'bg-ink-600'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
    />
  </button>
);

export const SectionHeading = ({ eyebrow, title, description, center = false, dark = false }) => (
  <div className={`${center ? 'mx-auto text-center' : ''} max-w-2xl`}>
    {eyebrow && <p className={`eyebrow ${dark ? 'text-signal-300' : 'text-signal-600'}`}>{eyebrow}</p>}
    <h2 className={`mt-2 text-3xl font-bold sm:text-4xl ${dark ? 'text-white' : 'text-ink-950'}`}>{title}</h2>
    {description && <p className={`mt-3 text-base ${dark ? 'text-ink-300' : 'text-ink-500'}`}>{description}</p>}
  </div>
);
