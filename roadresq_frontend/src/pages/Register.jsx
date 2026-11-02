import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Car, Check, Wrench } from 'lucide-react';
import API from '../utils/api'; // Axios instance
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout, { PasswordInput } from '../components/AuthLayout';
import Button from '../components/ui/Button';
import { InlineAlert } from '../components/ui/Feedback';
import { homePathFor } from '../utils/routes';

const ROLES = [
  { value: 'user', label: 'I need assistance', sub: 'Driver or rider', icon: Car },
  { value: 'mechanic', label: "I'm a mechanic", sub: 'Accept and handle jobs', icon: Wrench },
];

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: searchParams.get('role') === 'mechanic' ? 'mechanic' : 'user',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    try {
      const res = await API.post('/auth/register', formData);
      // The API already returns a session: sign the user straight in
      login(res.data.user, res.data.token);
      toast({ tone: 'success', title: `Welcome to RoadResQ, ${res.data.user.name.split(' ')[0]}!` });
      navigate(homePathFor(res.data.user));
    } catch (err) {
      console.error('Registration Error:', err.response?.data);
      setError(err.response?.data?.message || (err.request ? 'Cannot reach the server. Please try again.' : 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-signal-600 hover:text-signal-700">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <InlineAlert>{error}</InlineAlert>}

        <fieldset>
          <legend className="label">I am…</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, label, sub, icon: Icon }) => {
              const selected = formData.role === value;
              return (
                <label
                  key={value}
                  className={`relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-all ${
                    selected ? 'border-signal-500 bg-signal-50/60' : 'border-ink-100 hover:border-ink-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={selected}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? 'bg-signal-500 text-white' : 'bg-ink-50 text-ink-500'}`}>
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-ink-900">{label}</span>
                  <span className="text-xs text-ink-500">{sub}</span>
                  {selected && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-signal-500 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" type="text" name="name" autoComplete="name" placeholder="Your name" value={formData.name} onChange={handleChange} required className="input" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required className="input" />
          </div>
          <div>
            <label htmlFor="phone" className="label">Phone</label>
            <input id="phone" type="tel" name="phone" autoComplete="tel" inputMode="tel" placeholder="Mobile number" value={formData.phone} onChange={handleChange} required className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="At least 6 characters" minLength={6} value={formData.password} onChange={handleChange} required />
        </div>

        <Button type="submit" size="lg" full loading={loading} iconRight={ArrowRight}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-xs text-ink-400">
          Your phone number is shared only with the person on the other side of an accepted request.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
