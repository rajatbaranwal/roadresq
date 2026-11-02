import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import API from '../utils/api';
import Chat from '../components/Chat';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent } from '../hooks/useSocket';
import { CHAT_STATUSES, serviceMeta } from '../utils/status';
import { Avatar, ConnectionStatus } from '../components/ui/Misc';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import Button from '../components/ui/Button';
import { homePathFor } from '../utils/routes';

// /chat?request=<helpRequestId>
const ChatPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request');

  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);

  const isMechanic = user?.role === 'mechanic';
  const listPath = isMechanic ? homePathFor(user) : '/my-requests';

  const fetchRequest = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await API.get(`/help/${requestId}`);
      setRequest(res.data.request);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this request.');
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Close the chat as soon as the request is resolved
  useSocketEvent('status-update', ({ requestId: id, newStatus, request: updated }) => {
    if (id !== requestId) return;
    setRequest((prev) => (updated ? updated : prev ? { ...prev, status: newStatus } : prev));
  });

  if (!requestId || error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="card">
          <EmptyState
            icon={MessageCircle}
            title={error ? 'Chat unavailable' : 'No conversation selected'}
            description={error || 'Open a chat from one of your accepted requests.'}
            action={<Button to={listPath}>{isMechanic ? 'Go to operations' : 'View my requests'}</Button>}
          />
        </div>
      </div>
    );
  }

  const otherParty = isMechanic ? request?.userId : request?.mechanicId;
  const otherRole = isMechanic ? 'Customer' : 'Mechanic';
  const disabledReason =
    request && !CHAT_STATUSES.includes(request.status)
      ? request.status === 'resolved'
        ? 'This request is resolved. Chat is closed.'
        : 'Chat opens once a mechanic accepts the request.'
      : null;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-canvas">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3 sm:px-6">
          <Link
            to={isMechanic ? homePathFor(user) : '/dashboard'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-600 hover:bg-ink-50"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <Avatar name={otherParty?.name ?? otherRole} tone={isMechanic ? 'signal' : 'volt'} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink-950">{otherParty?.name ?? (request ? otherRole : 'Loading…')}</p>
            <p className="flex items-center gap-2 truncate text-xs text-ink-500">
              <span>{otherRole}</span>
              {request && <span className="hidden sm:inline">· {serviceMeta(request.serviceType).label} · {request.vehicleType}</span>}
            </p>
          </div>
          {request && <StatusBadge status={request.status} className="hidden sm:inline-flex" />}
          {otherParty?.phone && (
            <a
              href={`tel:${otherParty.phone}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-600 hover:bg-ink-50"
              aria-label={`Call ${otherParty.name}`}
            >
              <Phone size={18} />
            </a>
          )}
          <ConnectionStatus showLabel={false} />
        </div>
      </header>

      <Chat requestId={requestId} disabledReason={disabledReason} otherName={otherParty?.name} />
    </div>
  );
};

export default ChatPage;
