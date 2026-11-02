import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, ArrowUp, Check, CheckCheck, Clock, Lock, RotateCw, WifiOff } from 'lucide-react';
import socket from '../socket';
import { useAuth } from '../context/AuthContext';
import { useSocketConnected, useSocketEvent } from '../hooks/useSocket';
import { addMessage, getMessages, nextLocalId, subscribe, updateMessage } from '../chatStore';
import { formatTime } from '../utils/format';

const ACK_TIMEOUT_MS = 5000;
const TYPING_RESEND_MS = 2500;
const TYPING_IDLE_MS = 3000;
const TYPING_DISPLAY_MS = 5000;

const DeliveryStatus = ({ m, onRetry }) => {
  if (m.status === 'sending') return <Clock size={12} aria-label="Sending" />;
  if (m.status === 'failed')
    return (
      <button onClick={onRetry} className="inline-flex items-center gap-1 font-semibold text-red-200 hover:text-white">
        <AlertCircle size={12} /> {m.error} · <RotateCw size={11} /> Retry
      </button>
    );
  if (m.status === 'delivered') return <CheckCheck size={13} aria-label="Delivered" className="text-volt-300" />;
  return (
    <span className="inline-flex items-center gap-1" title="Sent. The recipient was offline, and messages are not stored.">
      <Check size={13} aria-label="Sent" /> {m.offline && <span>recipient offline</span>}
    </span>
  );
};

// Live chat between the customer and the assigned mechanic of one help request.
// The server decides who receives the message; the client only sends requestId + text.
const Chat = ({ requestId, disabledReason, otherName }) => {
  const { user } = useAuth();

  // Handle both `id` and `_id` from AuthContext
  const userId = String(user?._id || user?.id);

  const connected = useSocketConnected();
  const [message, setMessage] = useState('');
  const [typingName, setTypingName] = useState(null);
  const chat = useSyncExternalStore(subscribe, () => getMessages(requestId));
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const typingRef = useRef({ sentAt: 0, idleTimer: null, displayTimer: null });

  // Keep the latest message (and typing indicator) in view
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length, typingName]);

  // Other participant typing
  useSocketEvent('typing', (t) => {
    if (t.requestId !== requestId || t.userId === userId) return;
    clearTimeout(typingRef.current.displayTimer);
    if (t.isTyping) {
      setTypingName(t.name);
      typingRef.current.displayTimer = setTimeout(() => setTypingName(null), TYPING_DISPLAY_MS);
    } else {
      setTypingName(null);
    }
  });

  // A message arriving ends the sender's typing indicator
  useEffect(() => {
    const last = chat[chat.length - 1];
    if (last && last.senderId !== userId) setTypingName(null);
  }, [chat, userId]);

  const emitTyping = (isTyping) => {
    if (connected) socket.emit('typing', { requestId, isTyping });
  };

  const stopTyping = () => {
    clearTimeout(typingRef.current.idleTimer);
    if (typingRef.current.sentAt) {
      typingRef.current.sentAt = 0;
      emitTyping(false);
    }
  };

  useEffect(() => {
    const t = typingRef.current;
    return () => {
      clearTimeout(t.idleTimer);
      clearTimeout(t.displayTimer);
    };
  }, []);

  const onInput = (value) => {
    setMessage(value);
    const t = typingRef.current;
    if (!value.trim()) return stopTyping();
    if (Date.now() - t.sentAt > TYPING_RESEND_MS) {
      t.sentAt = Date.now();
      emitTyping(true);
    }
    clearTimeout(t.idleTimer);
    t.idleTimer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const deliver = (localId, text) => {
    socket.timeout(ACK_TIMEOUT_MS).emit('sendMessage', { requestId, message: text }, (err, res) => {
      if (err || !res?.ok) {
        const error = err ? 'No response' : res?.error || 'Failed to send';
        console.warn('[chat] send failed:', error);
        updateMessage(requestId, localId, { status: 'failed', error });
      } else {
        updateMessage(requestId, localId, {
          status: res.delivered ? 'delivered' : 'sent',
          offline: !res.delivered,
          sentAt: res.message.sentAt,
        });
      }
    });
  };

  // ✅ Handle sending messages
  const handleSend = (e) => {
    e?.preventDefault();
    const text = message.trim();
    if (!text || !connected || disabledReason) return;

    // Show message locally right away, then confirm with the server's ack
    const localId = nextLocalId();
    addMessage(requestId, {
      localId,
      requestId,
      senderId: userId,
      senderName: user?.name,
      message: text,
      status: 'sending',
      sentAt: new Date().toISOString(),
    });
    setMessage('');
    stopTyping();
    deliver(localId, text);
    inputRef.current?.focus();
  };

  const retry = (m) => {
    updateMessage(requestId, m.localId, { status: 'sending', error: null });
    deliver(m.localId, m.message);
  };

  const inputDisabled = !connected || Boolean(disabledReason);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!connected && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800" role="status">
          <WifiOff size={15} /> Connection lost. Reconnecting…
        </div>
      )}
      {disabledReason && (
        <div className="flex items-center justify-center gap-2 bg-ink-100 px-4 py-2 text-sm text-ink-600">
          <Lock size={14} /> {disabledReason}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-5 sm:px-6" aria-live="polite">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {chat.length === 0 && (
            <div className="mx-auto my-10 max-w-sm text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-ink-300 shadow-card">
                <Lock size={22} />
              </div>
              <p className="font-semibold text-ink-800">Private conversation</p>
              <p className="mt-1 text-sm text-ink-500">
                Only you and {otherName ?? 'the other person on this request'} can see these messages.
                Messages aren't saved, so they disappear when the page is refreshed.
              </p>
            </div>
          )}

          {chat.map((m, i) => {
            const mine = m.senderId === userId;
            const prev = chat[i - 1];
            const grouped = prev && prev.senderId === m.senderId;
            return (
              <div
                key={m.localId}
                className={`flex max-w-[85%] flex-col animate-slide-up sm:max-w-[70%] ${mine ? 'items-end self-end' : 'items-start self-start'} ${
                  grouped ? '' : 'mt-2'
                }`}
              >
                {!mine && !grouped && (
                  <span className="mb-1 ml-1 text-xs font-medium text-ink-500">
                    {m.senderName}
                    {m.senderRole && <span className="text-ink-400"> · {m.senderRole === 'mechanic' ? 'Mechanic' : 'Customer'}</span>}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-sm ${
                    mine
                      ? `${m.status === 'failed' ? 'bg-red-600' : 'bg-ink-950'} text-white ${grouped ? 'rounded-tr-md' : 'rounded-br-md'}`
                      : `bg-white text-ink-900 ring-1 ring-ink-100 ${grouped ? 'rounded-tl-md' : 'rounded-bl-md'}`
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${mine ? 'text-ink-300' : 'text-ink-400'}`}>
                    {formatTime(m.sentAt)}
                    {mine && <DeliveryStatus m={m} onRetry={() => retry(m)} />}
                  </p>
                </div>
              </div>
            );
          })}

          {typingName && (
            <div className="mt-2 flex items-center gap-2 self-start animate-fade-in" role="status">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 ring-1 ring-ink-100">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-typing-dot" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              <span className="text-xs text-ink-400">{typingName} is typing…</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-ink-100 bg-white px-3 pt-3 pb-safe sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={inputDisabled ? (disabledReason ? 'Chat is closed' : 'Reconnecting…') : 'Write a message…'}
            value={message}
            maxLength={1000}
            disabled={inputDisabled}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="input max-h-32 min-h-[48px] flex-1 resize-none py-3 [field-sizing:content]"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={inputDisabled || !message.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-signal-500 text-white shadow-signal transition-all hover:bg-signal-600 active:scale-95 disabled:bg-ink-200 disabled:shadow-none"
            aria-label="Send message"
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
