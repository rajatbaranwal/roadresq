import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api'; // Your configured Axios instance
import AuthLayout, { PasswordInput } from '../components/AuthLayout';
import Button from '../components/ui/Button';
import { InlineAlert } from '../components/ui/Feedback';
import { homePathFor } from '../utils/routes';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false); // 🔄 for UX
  const [error, setError] = useState(null); // ❌ display error messages

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null); // reset error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await API.post('/auth/login', formData);
      const { user, token } = res.data;

      // Persist session + update context (also opens the socket connection)
      login(user, token);

      // Redirect based on role
      navigate(homePathFor(user));
    } catch (err) {
      console.error('Login error:', err.response?.data);
      setError(
        err.response?.data?.message ||
          (err.request ? 'Cannot reach the server. Check your connection and try again.' : 'Login failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to request assistance or manage your jobs."
      footer={
        <>
          Don’t have an account?{' '}
          <Link to="/register" className="font-semibold text-signal-600 hover:text-signal-700">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        {error && <InlineAlert>{error}</InlineAlert>}
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <Button type="submit" size="lg" full loading={loading} iconRight={ArrowRight}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
