import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import useMyRequests from '../hooks/useMyRequests';
import CustomerRequestCard from '../components/requests/CustomerRequestCard';
import Button from '../components/ui/Button';
import { CardSkeleton, EmptyState, InlineAlert } from '../components/ui/Feedback';
import { ConnectionStatus } from '../components/ui/Misc';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'open', label: 'Open', test: (r) => r.status !== 'resolved' },
  { key: 'resolved', label: 'Resolved', test: (r) => r.status === 'resolved' },
];

// Customer view: track own help requests with live status updates
const MyRequests = () => {
  const { requests, loading, error, refresh } = useMyRequests();
  const [filter, setFilter] = useState('all');
  const visible = requests.filter(FILTERS.find((f) => f.key === filter).test);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <ConnectionStatus />
          <h1 className="mt-2 text-3xl font-bold text-ink-950">My requests</h1>
          <p className="mt-1 text-ink-500">Every status change appears here in real time.</p>
        </div>
        <Button to="/help" icon={Plus}>New request</Button>
      </header>

      <div className="mt-6 inline-flex rounded-xl bg-ink-100 p-1" role="tablist" aria-label="Filter requests">
        {FILTERS.map((f) => {
          const count = requests.filter(f.test).length;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`h-9 rounded-lg px-4 text-sm font-semibold transition-all ${
                filter === f.key ? 'bg-white text-ink-900 shadow' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {f.label}
              {!loading && <span className="ml-1.5 text-xs text-ink-400">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {error && (
          <InlineAlert action={<Button size="sm" variant="outline" icon={RefreshCw} onClick={refresh}>Retry</Button>}>
            {error}
          </InlineAlert>
        )}

        {loading ? (
          <>
            <CardSkeleton rows={4} />
            <CardSkeleton rows={2} />
          </>
        ) : visible.length === 0 ? (
          <div className="card">
            <EmptyState
              title={filter === 'all' ? 'No requests yet' : `No ${filter} requests`}
              description={filter === 'all' ? 'When you need roadside help, your requests and their progress will appear here.' : 'Try another filter.'}
              action={filter === 'all' && <Button to="/help" icon={Plus}>Request assistance</Button>}
            />
          </div>
        ) : (
          visible.map((req) => <CustomerRequestCard key={req._id} request={req} />)
        )}
      </div>
    </div>
  );
};

export default MyRequests;
