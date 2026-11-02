// Loading, empty and inline-alert states shared across pages
import { AlertTriangle } from 'lucide-react';

export const Skeleton = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded-lg bg-ink-100 ${className}`} aria-hidden>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

export const CardSkeleton = ({ rows = 3 }) => (
  <div className="card p-5 space-y-3" aria-busy="true" aria-label="Loading">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} className={`h-3 ${i % 2 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

// Small road-and-pin illustration used by empty states
const RoadIllustration = () => (
  <svg viewBox="0 0 160 96" className="h-20 w-auto" aria-hidden>
    <path d="M8 84 C 48 84, 56 40, 96 40 S 150 20, 152 12" fill="none" stroke="#E7EAF1" strokeWidth="14" strokeLinecap="round" />
    <path d="M8 84 C 48 84, 56 40, 96 40 S 150 20, 152 12" fill="none" stroke="#CDD3DF" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" />
    <path d="M96 10c-7 0-12.5 5.4-12.5 12.1C83.5 31.6 96 43 96 43s12.5-11.4 12.5-20.9C108.5 15.4 103 10 96 10z" fill="#FF6A1A" />
    <circle cx="96" cy="22" r="4.5" fill="#fff" />
  </svg>
);

export const EmptyState = ({ title, description, action, icon: Icon, className = '' }) => (
  <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
    {Icon ? (
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-400">
        <Icon size={26} aria-hidden />
      </div>
    ) : (
      <div className="mb-4"><RoadIllustration /></div>
    )}
    <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const InlineAlert = ({ children, tone = 'danger', action }) => {
  const tones = {
    danger: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-ink-200 bg-ink-50 text-ink-700',
  };
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
};
