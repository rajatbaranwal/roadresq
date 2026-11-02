import { Link } from 'react-router-dom';

export const LogoMark = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden>
    <rect width="64" height="64" rx="16" fill="#FF6A1A" />
    <path d="M32 12c-8.3 0-15 6.5-15 14.6C17 38 32 52 32 52s15-14 15-25.4C47 18.5 40.3 12 32 12z" fill="#080D19" />
    <circle cx="32" cy="26.5" r="6.5" fill="#FF6A1A" />
    <circle cx="32" cy="26.5" r="3" fill="#B5E31F" />
  </svg>
);

const Logo = ({ to = '/', dark = true, className = '' }) => (
  <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="RoadResQ home">
    <LogoMark />
    <span className={`font-display text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-ink-950'}`}>
      Road<span className="text-signal-500">ResQ</span>
    </span>
  </Link>
);

export default Logo;
