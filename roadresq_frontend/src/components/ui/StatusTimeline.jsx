import { Check } from 'lucide-react';
import { TIMELINE_STEPS, statusReachedAt } from '../../utils/status';
import { formatDateTime } from '../../utils/format';

// Request Created → Accepted (mechanic assigned) → In Progress → Resolved.
// Timestamps come from the request's statusHistory; legacy requests show none.
const StatusTimeline = ({ request, orientation = 'responsive', dark = false }) => {
  const currentIndex = Math.max(0, TIMELINE_STEPS.findIndex((s) => s.status === request.status));
  const horizontal = orientation === 'horizontal';
  const responsive = orientation === 'responsive';

  const muted = dark ? 'text-ink-400' : 'text-ink-400';
  const strong = dark ? 'text-white' : 'text-ink-900';

  return (
    <ol
      className={
        horizontal
          ? 'grid grid-cols-4 gap-2'
          : responsive
            ? 'flex flex-col gap-0 sm:grid sm:grid-cols-4 sm:gap-2'
            : 'flex flex-col gap-0'
      }
      aria-label="Request progress"
    >
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIndex || request.status === 'resolved';
        const current = i === currentIndex && request.status !== 'resolved';
        const reached = i <= currentIndex;
        const at = reached ? statusReachedAt(request, step.status) : null;
        const isLast = i === TIMELINE_STEPS.length - 1;

        return (
          <li
            key={step.status}
            className={`relative flex gap-3 ${horizontal || responsive ? `${horizontal ? 'flex-col' : 'sm:flex-col'}` : ''} ${
              !isLast ? (horizontal ? '' : responsive ? 'pb-5 sm:pb-0' : 'pb-5') : ''
            }`}
            aria-current={current ? 'step' : undefined}
          >
            {/* connector */}
            {!isLast && (
              <span
                aria-hidden
                className={`absolute ${
                  horizontal
                    ? 'left-7 -right-2 top-[13px] h-0.5'
                    : responsive
                      ? 'left-[13px] top-7 bottom-0 w-0.5 sm:left-7 sm:-right-2 sm:top-[13px] sm:bottom-auto sm:h-0.5 sm:w-auto'
                      : 'left-[13px] top-7 bottom-0 w-0.5'
                } ${i < currentIndex ? 'bg-volt-400' : dark ? 'bg-white/10' : 'bg-ink-100'} transition-colors duration-500`}
              />
            )}
            <span
              className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
                done
                  ? 'border-volt-400 bg-volt-400 text-ink-950'
                  : current
                    ? 'border-signal-500 bg-signal-500 text-white shadow-[0_0_0_4px_rgba(255,106,26,0.18)]'
                    : dark
                      ? 'border-white/15 bg-ink-900 text-ink-500'
                      : 'border-ink-200 bg-white text-ink-300'
              }`}
            >
              {done ? (
                <Check size={14} strokeWidth={3} aria-hidden />
              ) : current ? (
                <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" />
              ) : (
                <span className="text-[11px] font-semibold">{i + 1}</span>
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm font-semibold ${reached ? strong : muted}`}>{step.label}</p>
              {step.sub && <p className={`text-xs ${muted}`}>{step.sub}</p>}
              {at && <p className={`text-xs ${dark ? 'text-ink-300' : 'text-ink-500'}`}>{formatDateTime(at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default StatusTimeline;
