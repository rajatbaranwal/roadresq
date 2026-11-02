import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Info, Send } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useMyRequests from '../hooks/useMyRequests';
import LocationPicker from '../components/map/LocationPicker';
import Button from '../components/ui/Button';
import { InlineAlert } from '../components/ui/Feedback';
import { SERVICE_TYPES, URGENCIES, VEHICLE_TYPES, serviceMeta } from '../utils/status';

const Section = ({ step, title, hint, children, error }) => (
  <section className="card p-5 sm:p-6">
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">{step}</span>
      <div>
        <h2 className="text-lg font-semibold text-ink-950">{title}</h2>
        {hint && <p className="text-sm text-ink-500">{hint}</p>}
      </div>
    </div>
    {children}
    {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
  </section>
);

const chip = (selected) =>
  `inline-flex h-11 items-center rounded-xl border px-4 text-sm font-medium transition-all ${
    selected ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
  }`;

const HelpRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { requests } = useMyRequests();
  const openRequest = requests.find((r) => r.status !== 'resolved');

  const [form, setForm] = useState({
    serviceType: '',
    vehicleType: '',
    description: '',
    urgency: 'Medium',
  });
  const [customVehicle, setCustomVehicle] = useState(false);
  const [location, setLocation] = useState(null); // [lat, lng]
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.serviceType) e.serviceType = 'Choose the type of help you need.';
    if (!location) e.location = 'Set your location using GPS or by tapping the map.';
    if (!form.vehicleType.trim()) e.vehicleType = 'Tell us what you are driving.';
    if (!form.description.trim()) e.description = 'Add a short description of the problem.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      toast({ tone: 'error', title: 'A few details are missing', description: 'Check the highlighted sections.' });
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/help/request', {
        ...form,
        vehicleType: form.vehicleType.trim(),
        description: form.description.trim(),
        location: `${location[0]},${location[1]}`,
      });
      toast({ tone: 'success', title: 'Request sent', description: 'Available mechanics have been alerted.' });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || 'Failed to send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = serviceMeta(form.serviceType);
  const missing = [!form.serviceType && 'type', !location && 'location', !form.vehicleType.trim() && 'vehicle', !form.description.trim() && 'details'].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:px-6 sm:pb-16">
      <header className="mb-6">
        <p className="eyebrow text-signal-600">Roadside assistance</p>
        <h1 className="mt-1 text-3xl font-bold text-ink-950">Request help</h1>
        <p className="mt-1 text-ink-500">Four quick steps. Mechanics are alerted the moment you submit.</p>
      </header>

      {openRequest && (
        <div className="mb-5">
          <InlineAlert
            tone="info"
            action={
              <Link to="/dashboard" className="whitespace-nowrap text-sm font-semibold text-signal-600">
                Track it →
              </Link>
            }
          >
            You already have an open request ({serviceMeta(openRequest.serviceType).label}). You can still create another one.
          </InlineAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Section step="1" title="What do you need help with?" error={errors.serviceType}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Assistance type">
            {SERVICE_TYPES.map(({ value, label, icon: Icon }) => {
              const selected = form.serviceType === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update({ serviceType: value })}
                  className={`flex min-h-[92px] flex-col items-start justify-between gap-2 rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.98] ${
                    selected ? 'border-signal-500 bg-signal-50 shadow-[0_0_0_4px_rgba(255,106,26,0.12)]' : 'border-ink-100 bg-white hover:border-ink-200'
                  }`}
                >
                  <Icon size={22} className={selected ? 'text-signal-600' : 'text-ink-400'} aria-hidden />
                  <span className="text-sm font-semibold leading-tight text-ink-900">{label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section step="2" title="Where are you?" hint="We'll share this only with the mechanic who accepts." error={errors.location}>
          <LocationPicker
            value={location}
            onChange={(p) => {
              setLocation(p);
              setErrors((e) => ({ ...e, location: undefined }));
            }}
          />
        </Section>

        <Section step="3" title="Your vehicle" error={errors.vehicleType}>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_TYPES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setCustomVehicle(false);
                  update({ vehicleType: v });
                }}
                className={chip(!customVehicle && form.vehicleType === v)}
                aria-pressed={!customVehicle && form.vehicleType === v}
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCustomVehicle(true);
                update({ vehicleType: '' });
              }}
              className={chip(customVehicle)}
              aria-pressed={customVehicle}
            >
              Other
            </button>
          </div>
          {customVehicle && (
            <input
              autoFocus
              type="text"
              maxLength={50}
              placeholder="e.g. Toyota Innova, white"
              value={form.vehicleType}
              onChange={(e) => update({ vehicleType: e.target.value })}
              className={`input mt-3 ${errors.vehicleType ? 'input-error' : ''}`}
              aria-label="Vehicle type"
            />
          )}
        </Section>

        <Section step="4" title="Describe the problem" error={errors.description}>
          <textarea
            rows={4}
            maxLength={1000}
            placeholder={
              form.serviceType
                ? `${selectedService.description}. Add anything that helps, like a landmark, which tyre, or warning lights.`
                : 'What happened? Add a landmark if you can.'
            }
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            className={`input resize-none ${errors.description ? 'input-error' : ''}`}
            aria-label="Problem description"
          />
          <div className="mt-4">
            <p className="label">How urgent is it?</p>
            <div className="inline-grid w-full grid-cols-3 rounded-xl bg-ink-100 p-1 sm:w-auto" role="radiogroup" aria-label="Urgency">
              {URGENCIES.map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={form.urgency === u}
                  onClick={() => update({ urgency: u })}
                  className={`h-10 rounded-lg px-5 text-sm font-semibold transition-all ${
                    form.urgency === u
                      ? u === 'High'
                        ? 'bg-signal-500 text-white shadow'
                        : 'bg-white text-ink-900 shadow'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
            <Info size={14} className="mt-0.5 shrink-0" />
            {user?.phone
              ? `Your account phone (${user.phone}) is shared with the mechanic after they accept.`
              : 'Your account phone number is shared with the mechanic after they accept.'}
          </p>
        </Section>

        {submitError && <InlineAlert>{submitError}</InlineAlert>}

        {/* Desktop submit */}
        <div className="hidden items-center justify-between gap-4 sm:flex">
          <p className="text-sm text-ink-500">
            {missing.length ? `Still needed: ${missing.join(', ')}` : 'Everything looks good.'}
          </p>
          <Button type="submit" size="lg" loading={submitting} icon={Send}>
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </div>

        {/* Mobile sticky submit bar */}
        <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-ink-100 bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_-12px_rgba(14,21,37,0.25)] backdrop-blur pb-safe sm:hidden">
          <Button type="submit" size="lg" full loading={submitting} iconRight={submitting ? undefined : ArrowRight}>
            {submitting ? 'Sending…' : missing.length ? `Send request · ${4 - missing.length}/4 done` : 'Send request'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HelpRequest;
