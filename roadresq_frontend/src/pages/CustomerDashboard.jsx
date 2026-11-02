import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CheckCircle2, ClipboardList, History, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useMyRequests from '../hooks/useMyRequests';
import { useNow } from '../hooks/useLocation';
import CustomerRequestCard from '../components/requests/CustomerRequestCard';
import { ServiceIcon } from '../components/requests/RequestBits';
import Button from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { CardSkeleton, EmptyState, InlineAlert } from '../components/ui/Feedback';
import { ConnectionStatus } from '../components/ui/Misc';
import { serviceMeta } from '../utils/status';
import { firstName, formatDateTime, greeting, timeAgo } from '../utils/format';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { requests, loading, error, refresh } = useMyRequests();
  const { items: notifications } = useNotifications();
  const now = useNow(30000);

  const open = requests.filter((r) => r.status !== 'resolved');
  const [active, ...otherOpen] = open;
  const resolved = requests.filter((r) => r.status === 'resolved');

  return (
    <div className="min-h-[calc(100dvh-4rem)] pb-16">
      {/* Welcome band */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="absolute inset-0 bg-grid opacity-70" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-24 pt-8 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <ConnectionStatus dark />
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              {greeting()}, {firstName(user?.name)}
            </h1>
            <p className="mt-2 text-ink-300">
              {active ? 'Your request is live. Updates appear here instantly.' : 'Need a hand on the road? Help is a few taps away.'}
            </p>
          </div>
          <Button to="/help" size="lg" icon={Plus} className="w-full md:w-auto">
            {active ? 'New request' : 'Request assistance'}
          </Button>
        </div>
      </section>

      <div className="relative mx-auto -mt-16 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="space-y-6">
          {error && (
            <InlineAlert action={<Button size="sm" variant="outline" icon={RefreshCw} onClick={refresh}>Retry</Button>}>
              {error}
            </InlineAlert>
          )}

          {loading ? (
            <CardSkeleton rows={5} />
          ) : active ? (
            <div>
              <h2 className="sr-only">Active request</h2>
              <CustomerRequestCard key={active._id} request={active} featured />
            </div>
          ) : (
            <div className="card">
              <EmptyState
                title="No active requests"
                description="When you request assistance, you'll follow its progress, your mechanic and their live location right here."
                action={<Button to="/help" icon={Plus}>Request assistance</Button>}
              />
            </div>
          )}

          {otherOpen.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Other open requests</h2>
              <div className="space-y-4">
                {otherOpen.map((r) => (
                  <CustomerRequestCard key={r._id} request={r} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <ClipboardList size={18} className="text-ink-400" /> Your requests
            </h2>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['Total', requests.length],
                ['Open', open.length],
                ['Resolved', resolved.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-ink-50 px-2 py-3">
                  <dd className="font-display text-2xl font-semibold text-ink-950">{loading ? '–' : value}</dd>
                  <dt className="text-xs text-ink-500">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Bell size={18} className="text-ink-400" /> Recent updates
            </h2>
            {notifications.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">Status changes and messages will show up here while you're signed in.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <Link to={n.link ?? '/dashboard'} className="block rounded-xl p-2 -m-2 hover:bg-ink-50">
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      <p className="line-clamp-1 text-sm text-ink-500">{n.body}</p>
                      <p className="text-xs text-ink-400">{timeAgo(n.at, now)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <History size={18} className="text-ink-400" /> History
              </h2>
              <Link to="/my-requests" className="text-sm font-medium text-signal-600 hover:text-signal-700">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="mt-4 space-y-3">
                <div className="h-10 animate-pulse rounded-xl bg-ink-50" />
                <div className="h-10 animate-pulse rounded-xl bg-ink-50" />
              </div>
            ) : resolved.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-500">
                <CheckCircle2 size={16} className="text-ink-300" /> Resolved requests will be listed here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-ink-100">
                {resolved.slice(0, 5).map((r) => (
                  <li key={r._id} className="flex items-center gap-3 py-3">
                    <ServiceIcon serviceType={r.serviceType} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{serviceMeta(r.serviceType).label}</p>
                      <p className="text-xs text-ink-500">{formatDateTime(r.createdAt)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/my-requests"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900"
            >
              All requests <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CustomerDashboard;
