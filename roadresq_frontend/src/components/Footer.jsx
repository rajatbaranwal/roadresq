import { Link } from 'react-router-dom';
import Logo from './ui/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/help', label: 'Request assistance' },
      { to: '/my-requests', label: 'Track a request' },
      { to: '/#services', label: 'Services' },
    ],
  },
  {
    title: 'For mechanics',
    links: [
      { to: '/register?role=mechanic', label: 'Join as a mechanic' },
      { to: '/dashboard/mechanic', label: 'Operations dashboard' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/register', label: 'Create account' },
      { to: '/#safety', label: 'Safety & privacy' },
    ],
  },
];

const Footer = () => (
  <footer className="bg-ink-950 text-ink-300">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Logo />
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
          Roadside assistance you can follow: request help, see who's coming, and stay in touch until you're back on the road.
        </p>
      </div>
      {COLUMNS.map((col) => (
        <div key={col.title}>
          <p className="eyebrow text-ink-500">{col.title}</p>
          <ul className="mt-4 space-y-2.5">
            {col.links.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-ink-300 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-500 sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} RoadResQ. All rights reserved.</p>
        <p>Map data © OpenStreetMap contributors</p>
      </div>
    </div>
  </footer>
);

export default Footer;
