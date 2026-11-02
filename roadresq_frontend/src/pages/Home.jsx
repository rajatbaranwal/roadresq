import {
  ArrowRight,
  Crosshair,
  EyeOff,
  FileText,
  Lock,
  MessageCircle,
  Navigation,
  PhoneOff,
  Radio,
  ShieldCheck,
  Smartphone,
  TimerOff,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Footer from '../components/Footer';
import StatusTimeline from '../components/ui/StatusTimeline';
import { SectionHeading } from '../components/ui/Misc';
import { SERVICE_TYPES } from '../utils/status';

const STEPS = [
  { icon: Crosshair, title: 'Pin your location', text: 'Use GPS or tap the map. Drag the pin to the exact spot.' },
  { icon: FileText, title: 'Tell us what happened', text: 'Pick the kind of help you need and add a short note.' },
  { icon: UserCheck, title: 'A mechanic accepts', text: 'Available mechanics are alerted instantly. You see who took the job.' },
  { icon: Navigation, title: 'Track and chat live', text: 'Follow your mechanic on the map and message them directly.' },
];

const FEATURES = [
  { icon: Radio, title: 'Real-time from start to finish', text: 'Status changes reach you the moment they happen, with no refreshing.' },
  { icon: Navigation, title: 'Live mechanic location', text: 'When your mechanic shares their location, you see them move on the map.' },
  { icon: MessageCircle, title: 'Direct in-app chat', text: 'Talk to the mechanic assigned to your request, with typing and delivery indicators.' },
  { icon: Smartphone, title: 'Built for the roadside', text: 'Large controls and a mobile-first flow you can use one-handed.' },
];

const SAFETY = [
  { icon: EyeOff, title: 'Location stays private', text: 'Only the mechanic assigned to your request can see your live position.' },
  { icon: TimerOff, title: 'Sharing stops automatically', text: 'Live location sharing ends when the job is resolved.' },
  { icon: PhoneOff, title: 'Contact details on acceptance', text: 'Mechanics see your phone number only after they accept your request.' },
  { icon: Lock, title: 'Signed-in access only', text: 'Every request, update and message is tied to an authenticated account.' },
];

// Illustration only: a stylized map with a route and product UI fragments (no data)
const HeroVisual = () => (
  <div className="relative mx-auto w-full max-w-lg" aria-hidden>
    <div className="absolute -inset-10 rounded-full bg-signal-500/20 blur-3xl" />
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-900 p-3 shadow-2xl">
      <svg viewBox="0 0 400 300" className="w-full rounded-2xl bg-[#101a2e]">
        <defs>
          <pattern id="blocks" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="#101a2e" />
            <rect x="6" y="6" width="38" height="38" rx="6" fill="#16223a" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#blocks)" />
        <path d="M0 210 C 90 200, 120 120, 210 120 S 330 70, 400 40" stroke="#22304d" strokeWidth="26" fill="none" />
        <path d="M120 0 C 130 90, 170 200, 150 300" stroke="#22304d" strokeWidth="18" fill="none" />
        <path d="M260 300 C 255 220, 300 170, 400 160" stroke="#1d2a44" strokeWidth="14" fill="none" />
        {/* route from mechanic to customer */}
        <path
          d="M70 205 C 110 198, 135 135, 210 122 S 300 92, 318 84"
          stroke="#B5E31F"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="2 10"
          fill="none"
          className="motion-safe:animate-dash"
        />
        {/* mechanic */}
        <circle cx="70" cy="205" r="18" fill="#B5E31F" opacity=".22" />
        <circle cx="70" cy="205" r="10" fill="#0E1525" stroke="#B5E31F" strokeWidth="3" />
        {/* customer pin */}
        <path d="M318 46c-11 0-20 8.7-20 19.5C298 80 318 98 318 98s20-18 20-32.5C338 54.7 329 46 318 46z" fill="#FF6A1A" stroke="#fff" strokeWidth="3" />
        <circle cx="318" cy="65" r="6.5" fill="#fff" />
      </svg>

      {/* floating status card */}
      <div className="absolute left-6 top-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-950/90 px-3.5 py-2.5 backdrop-blur">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-volt-400 text-ink-950">
          <Wrench size={17} />
        </span>
        <div>
          <p className="text-[11px] font-medium text-ink-400">Flat tyre · Car</p>
          <p className="text-sm font-semibold text-white">Mechanic assigned</p>
        </div>
      </div>

      {/* live chip */}
      <div className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/90 px-3 py-1.5 text-xs font-medium text-volt-300 backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-volt-400 opacity-70" />
          <span className="relative h-2 w-2 rounded-full bg-volt-400" />
        </span>
        Live location
      </div>
    </div>
  </div>
);

const Home = () => {
  const { user } = useAuth();
  const isMechanic = user?.role === 'mechanic';

  const primary = !user
    ? { to: '/register', label: 'Request assistance' }
    : isMechanic
      ? { to: '/dashboard/mechanic', label: 'Open operations' }
      : { to: '/help', label: 'Request assistance' };
  const secondary = !user
    ? { to: '/register?role=mechanic', label: "I'm a mechanic" }
    : isMechanic
      ? null
      : { to: '/dashboard', label: 'Go to my dashboard' };

  // Illustrative timeline for the features section (no dates, not a real request)
  const demoRequest = { status: 'in-progress', createdAt: null, statusHistory: [] };

  return (
    <div className="-mt-16 bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 pt-16">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
          <div className="animate-slide-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-ink-200">
              <span className="h-1.5 w-1.5 rounded-full bg-volt-400" /> Real-time roadside assistance
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Stuck on the road?
              <br />
              <span className="text-signal-400">Help, tracked live.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
              Drop a pin, tell us what's wrong, and an available mechanic picks up your request. See who's coming, follow them on the map, and chat until you're moving again.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to={primary.to} size="lg" iconRight={ArrowRight}>
                {primary.label}
              </Button>
              {secondary && (
                <Button to={secondary.to} size="lg" variant="glass">
                  {secondary.label}
                </Button>
              )}
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-ink-300 sm:grid-cols-3">
              {[
                [Navigation, 'Live mechanic tracking'],
                [MessageCircle, 'Private in-app chat'],
                [ShieldCheck, 'Location shared only with your mechanic'],
              ].map(([Icon, text]) => (
                <li key={text} className="flex items-start gap-2">
                  <Icon size={16} className="mt-0.5 shrink-0 text-volt-400" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-slide-up [animation-delay:120ms]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From breakdown to back on the road"
            description="Four steps, designed to take seconds when you're standing by the roadside."
          />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card group relative p-6 transition-shadow hover:shadow-lift">
                <span className="font-display text-5xl font-bold text-ink-100 transition-colors group-hover:text-signal-100">
                  0{i + 1}
                </span>
                <span className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-xl bg-ink-950 text-signal-400">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-20 bg-canvas py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Assistance types"
            title="Whatever stopped you, tell us in one tap"
            description="Choosing the type of problem helps the mechanic arrive prepared."
          />
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {SERVICE_TYPES.map(({ value, label, description, icon: Icon }) => (
              <div
                key={value}
                className="card group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-signal-200 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-signal-50 text-signal-600 transition-colors group-hover:bg-signal-500 group-hover:text-white">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{label}</h3>
                <p className="mt-1 text-sm text-ink-500">{description}</p>
              </div>
            ))}
            <div className="col-span-2 flex flex-col justify-between rounded-2xl bg-ink-950 p-5 text-white lg:col-span-1">
              <p className="font-display text-lg font-semibold">Need help now?</p>
              <Button to={primary.to} variant="primary" size="sm" iconRight={ArrowRight} className="mt-4 self-start">
                Request assistance
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why RoadResQ */}
      <section className="relative overflow-hidden bg-ink-950 py-20 sm:py-24">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              dark
              eyebrow="Why RoadResQ"
              title="You always know what's happening"
              description="No phone tag, no guessing. Every step of your request is visible the moment it changes."
            />
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-volt-400 ring-1 ring-white/10">
                    <Icon size={19} aria-hidden />
                  </span>
                  <h3 className="mt-3 font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-300">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-dark p-6 sm:p-8" aria-label="Example of the request timeline">
            <p className="eyebrow text-ink-400">Example request timeline</p>
            <p className="mt-2 font-display text-xl font-semibold">Battery jump-start · SUV</p>
            <div className="mt-6">
              <StatusTimeline request={demoRequest} orientation="vertical" dark />
            </div>
          </div>
        </div>
      </section>

      {/* Safety & trust */}
      <section id="safety" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            center
            eyebrow="Safety & trust"
            title="Privacy built into every request"
            description="Your location and contact details are shared only when needed, and only with the person helping you."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SAFETY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-ink-100 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-volt-100 text-volt-700">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-signal-500 to-signal-700 px-6 py-12 sm:px-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-white">Broken down right now?</h2>
              <p className="mt-2 max-w-lg text-signal-50">Send your location and the problem, and mechanics are alerted immediately.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button to={primary.to} variant="dark" size="lg" iconRight={ArrowRight}>
                {primary.label}
              </Button>
              {!user && (
                <Button to="/register?role=mechanic" size="lg" variant="glass" className="border-white/30">
                  Join as a mechanic
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
