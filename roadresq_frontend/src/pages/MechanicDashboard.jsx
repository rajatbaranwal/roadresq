import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BadgeCheck, CheckCircle2, Inbox, RefreshCw, Siren, Volume2, VolumeX, Wrench } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useSocketEvent, useResyncOnReconnect } from '../hooks/useSocket';
import { useNow } from '../hooks/useLocation';
import { getAvailable, setAvailable, subscribeAvailable } from '../services/availability';
import IncomingRequestCard from '../components/mechanic/IncomingRequestCard';
import ActiveJobCard from '../components/mechanic/ActiveJobCard';
import { ServiceIcon } from '../components/requests/RequestBits';
import { StatusBadge } from '../components/ui/Badge';
import { CardSkeleton, EmptyState, InlineAlert } from '../components/ui/Feedback';
import { ConnectionStatus, StatTile, Switch } from '../components/ui/Misc';
import Button from '../components/ui/Button';
import { isActiveJob, serviceMeta, upsertRequest } from '../utils/status';
import { firstName, formatDateTime } from '../utils/format';

const NEW_HIGHLIGHT_MS = 8000;

const MechanicDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { soundEnabled, setSoundEnabled } = useNotifications();
  const myId = user?.id || user?._id;
  const now = useNow(30000);
  const available = useSyncExternalStore(subscribeAvailable, getAvailable);

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('incoming');
  const [busy, setBusy] = useState({}); // { [id]: 'accept' | 'decline' | 'advance' }
  const [newIds, setNewIds] = useState(() => new Set());
  const statsTimer = useRef(null);

  // ✅ Fetch help requests (on mount and after a reconnect that missed events)
  const fetchRequests = useCallback(async () => {
    try {
      const res = await API.get('/help/all');
      setRequests(res.data.requests);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch help requests:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/help/stats');
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err.response?.data || err.message);
    }
  }, []);

  // Coalesce bursts of events into one stats request
  const refreshStatsSoon = useCallback(() => {
    clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(fetchStats, 400);
  }, [fetchStats]);

  useEffect(() => {
    fetchRequests();
    fetchStats();
    return () => clearTimeout(statsTimer.current);
  }, [fetchRequests, fetchStats]);

  useResyncOnReconnect(() => {
    fetchRequests();
    fetchStats();
  });

  // ✅ Real-time new help requests (toast + sound come from NotificationContext)
  useSocketEvent('new-help-request', (newRequest) => {
    setRequests((prev) => upsertRequest(prev, newRequest)); // upsert => never duplicated
    setNewIds((prev) => new Set(prev).add(newRequest._id));
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(newRequest._id);
        return next;
      });
    }, NEW_HIGHLIGHT_MS);
    refreshStatsSoon();
  });

  // ✅ Keep list in sync when any request changes status
  useSocketEvent('status-update', ({ requestId, newStatus, mechanicId, request }) => {
    setRequests((prev) => {
      // Taken by another mechanic => no longer relevant to me
      if (mechanicId && mechanicId !== myId) return prev.filter((r) => r._id !== requestId);
      if (request) return upsertRequest(prev, request);
      return prev.map((r) => (r._id === requestId ? { ...r, status: newStatus } : r));
    });
    refreshStatsSoon();
  });

  const setBusyFor = (id, value) => setBusy((b) => ({ ...b, [id]: value }));

  const changeStatus = async (id, newStatus) => {
    setBusyFor(id, newStatus === 'accepted' ? 'accept' : 'advance');
    try {
      const res = await API.patch(`/help/${id}/status`, { status: newStatus });
      setRequests((prev) => upsertRequest(prev, res.data.helpRequest));
      if (newStatus === 'accepted') {
        toast({ tone: 'success', title: 'Job accepted', description: 'Customer details are now available.' });
        setTab('active');
      } else if (newStatus === 'resolved') {
        toast({ tone: 'success', title: 'Job resolved', description: 'Nice work. Location sharing has stopped.' });
      } else {
        toast({ tone: 'info', title: 'Job started', description: 'The customer has been notified.' });
      }
      refreshStatsSoon();
    } catch (err) {
      toast({ tone: 'error', title: 'Could not update the request', description: err.response?.data?.message || 'Please try again.' });
      if ([403, 409].includes(err.response?.status)) fetchRequests();
    } finally {
      setBusyFor(id, null);
    }
  };

  const decline = async (id) => {
    setBusyFor(id, 'decline');
    try {
      await API.patch(`/help/${id}/reject`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      toast({ tone: 'info', title: 'Request declined', description: "It's hidden from your list. Other mechanics can still accept it." });
      refreshStatsSoon();
    } catch (err) {
      toast({ tone: 'error', title: 'Could not decline', description: err.response?.data?.message || 'Please try again.' });
      fetchRequests();
    } finally {
      setBusyFor(id, null);
    }
  };

  const toggleAvailability = (value) => {
    setAvailable(value);
    toast({
      tone: value ? 'success' : 'info',
      title: value ? 'You are available' : 'New request alerts paused',
      description: value ? 'You will be alerted about new requests.' : 'Your active jobs are not affected.',
    });
    if (value) fetchRequests();
  };

  const incoming = requests.filter((r) => r.status === 'pending');
  const active = requests.filter((r) => isActiveJob(r.status));
  const completed = requests.filter((r) => r.status === 'resolved');

  const TABS = [
    { key: 'incoming', label: 'Incoming', count: incoming.length, icon: Inbox },
    { key: 'active', label: 'Active', count: active.length, icon: Wrench },
    { key: 'completed', label: 'Completed', count: completed.length, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-[calc(100dvh-4rem)] pb-16">
      {/* Operations header */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="absolute inset-0 bg-grid opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-signal-300">Operations</p>
              <h1 className="mt-1 text-3xl font-bold text-white">Hi, {firstName(user?.name)}</h1>
              <div className="mt-2">
                <ConnectionStatus dark />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
                <Switch checked={available} onChange={toggleAvailability} label="Available for new requests" />
                <div>
                  <p className="text-sm font-semibold text-white">{available ? 'Available' : 'Paused'}</p>
                  <p className="text-xs text-ink-400">{available ? 'Receiving new request alerts' : 'Not receiving alerts'}</p>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-ink-200 hover:bg-white/10"
                aria-label={soundEnabled ? 'Mute alert sound' : 'Unmute alert sound'}
                title={soundEnabled ? 'Alert sound on' : 'Alert sound off'}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Available requests" value={stats?.available ?? 0} icon={Siren} accent="signal" loading={!stats} />
            <StatTile label="Accepted" value={stats?.accepted ?? 0} icon={BadgeCheck} accent="sky" loading={!stats} />
            <StatTile label="In progress" value={stats?.inProgress ?? 0} icon={Wrench} accent="ink" loading={!stats} />
            <StatTile label="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} accent="volt" loading={!stats} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-card ring-1 ring-ink-100 sm:inline-flex" role="tablist">
          {TABS.map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-all sm:flex-none sm:gap-2 sm:px-4 ${
                tab === key ? 'bg-ink-950 text-white' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              <Icon size={16} aria-hidden className="hidden sm:block" />
              {label}
              <span
                key={count}
                className={`min-w-6 rounded-full px-1.5 py-0.5 text-xs animate-pop ${
                  tab === key ? 'bg-white/15' : key === 'incoming' && count > 0 ? 'bg-signal-500 text-white' : 'bg-ink-100'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {error && (
            <div className="mb-4">
              <InlineAlert action={<Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchRequests}>Retry</Button>}>
                {error}
              </InlineAlert>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : tab === 'incoming' ? (
            incoming.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={Inbox}
                  title="No open requests right now"
                  description={
                    available
                      ? "New requests appear here instantly, and you'll get an alert."
                      : 'Alerts are paused. Switch to Available to be notified of new requests.'
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {incoming.map((r) => (
                  <IncomingRequestCard
                    key={r._id}
                    request={r}
                    now={now}
                    isNew={newIds.has(r._id)}
                    busy={busy[r._id]}
                    onAccept={() => changeStatus(r._id, 'accepted')}
                    onDecline={() => decline(r._id)}
                  />
                ))}
              </div>
            )
          ) : tab === 'active' ? (
            active.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={Wrench}
                  title="No active jobs"
                  description="Accept a request from Incoming to start a job. Your map, customer details and controls appear here."
                  action={incoming.length > 0 && <Button onClick={() => setTab('incoming')}>View {incoming.length} incoming</Button>}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {active.map((r) => (
                  <ActiveJobCard key={r._id} request={r} busy={busy[r._id] === 'advance'} onAdvance={changeStatus} />
                ))}
              </div>
            )
          ) : completed.length === 0 ? (
            <div className="card">
              <EmptyState icon={CheckCircle2} title="No completed jobs yet" description="Resolved jobs will be listed here." />
            </div>
          ) : (
            <ul className="card divide-y divide-ink-100">
              {completed.map((r) => (
                <li key={r._id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <ServiceIcon serviceType={r.serviceType} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{serviceMeta(r.serviceType).label} · {r.userId?.name}</p>
                    <p className="text-xs text-ink-500">{r.vehicleType} · {formatDateTime(r.createdAt)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;
