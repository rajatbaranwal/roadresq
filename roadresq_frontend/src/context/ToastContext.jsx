import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, accent: 'text-volt-500', bar: 'bg-volt-400' },
  error: { icon: AlertTriangle, accent: 'text-red-500', bar: 'bg-red-500' },
  info: { icon: Info, accent: 'text-sky-500', bar: 'bg-sky-400' },
  alert: { icon: BellRing, accent: 'text-signal-500', bar: 'bg-signal-500' },
};

let seq = 0;

const ToastItem = ({ toast, onDismiss }) => {
  const { icon: Icon, accent, bar } = TONES[toast.tone] ?? TONES.info;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-ink-100 bg-white p-4 pl-5 shadow-lift animate-slide-down"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} aria-hidden />
      <Icon size={20} className={`mt-0.5 shrink-0 ${accent}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
        {toast.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{toast.description}</p>}
        {toast.action && (
          <Link
            to={toast.action.to}
            onClick={() => onDismiss(toast.id)}
            className="mt-2 inline-block text-sm font-semibold text-signal-600 hover:text-signal-700"
          >
            {toast.action.label} →
          </Link>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="-m-1 rounded-lg p-1 text-ink-300 hover:bg-ink-50 hover:text-ink-600"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const lastRef = useRef({ key: '', at: 0 });

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // toast({ title, description?, tone?: 'success'|'error'|'info'|'alert', action?: {label,to}, duration? })
  const toast = useCallback((opts) => {
    const t = typeof opts === 'string' ? { title: opts } : opts;
    // Drop exact duplicates fired in quick succession (e.g. double events)
    const key = `${t.tone}|${t.title}|${t.description}`;
    if (lastRef.current.key === key && Date.now() - lastRef.current.at < 1500) return;
    lastRef.current = { key, at: Date.now() };

    const id = ++seq;
    const duration = t.duration ?? (t.tone === 'error' || t.tone === 'alert' ? 7000 : 4500);
    setToasts((prev) => [...prev.slice(-3), { tone: 'info', ...t, id, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-[4.75rem] z-[1100] flex flex-col items-end gap-2 sm:left-auto sm:right-5 sm:w-96"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
