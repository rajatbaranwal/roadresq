import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { LogoMark } from './ui/Logo';

const POINTS = [
  'Request help in a few taps, with GPS or a map pin',
  'Follow your mechanic live once they share their location',
  'Chat directly with the mechanic assigned to you',
];

// Split layout: brand panel (desktop) + form
const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
    <aside className="relative hidden overflow-hidden bg-ink-950 lg:block">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-signal-500/25 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between p-12">
        <LogoMark className="h-12 w-12" />
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight text-white">
            Roadside help you can <span className="text-signal-400">actually follow.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-ink-200">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-volt-400" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-500">© {new Date().getFullYear()} RoadResQ</p>
      </div>
    </aside>

    <div className="flex items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md animate-slide-up">
        <h1 className="text-3xl font-bold text-ink-950">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-500">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <p className="mt-8 text-center text-sm text-ink-500">{footer}</p>}
      </div>
    </div>
  </div>
);

export const PasswordInput = ({ id, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={visible ? 'text' : 'password'} className="input pr-11" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-400 hover:text-ink-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default AuthLayout;
