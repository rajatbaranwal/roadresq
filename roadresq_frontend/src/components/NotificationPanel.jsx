import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, MessageCircle, Siren, Trash2, Volume2, VolumeX, Wrench } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNow } from '../hooks/useLocation';
import { timeAgo } from '../utils/format';

const TYPE_ICON = {
  request: { icon: Siren, cls: 'bg-signal-100 text-signal-600' },
  status: { icon: Wrench, cls: 'bg-volt-100 text-volt-700' },
  message: { icon: MessageCircle, cls: 'bg-sky-100 text-sky-700' },
};

const NotificationBell = () => {
  const { items, unreadCount, markAllRead, markRead, clearAll, soundEnabled, setSoundEnabled } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const now = useNow(30000);
  const desktopSupported = typeof Notification !== 'undefined';
  const [desktopPerm, setDesktopPerm] = useState(desktopSupported ? Notification.permission : 'denied');

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-200 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            key={unreadCount}
            className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-signal-500 px-1 text-[11px] font-bold text-white ring-2 ring-ink-950 animate-pop"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] z-[1050] overflow-hidden rounded-2xl border border-ink-100 bg-white text-ink-900 shadow-lift animate-slide-down sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="font-display font-semibold">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-50"
                title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
                aria-label={soundEnabled ? 'Mute notification sounds' : 'Unmute notification sounds'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                onClick={markAllRead}
                disabled={!unreadCount}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-50 disabled:opacity-40"
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
              <button
                onClick={clearAll}
                disabled={!items.length}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-50 disabled:opacity-40"
                title="Clear all"
                aria-label="Clear all notifications"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <ul className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <li className="flex flex-col items-center px-6 py-10 text-center">
                <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink-50 text-ink-300">
                  <BellOff size={22} />
                </span>
                <p className="text-sm font-medium text-ink-700">You're all caught up</p>
                <p className="mt-1 text-xs text-ink-400">New requests, status changes and messages appear here.</p>
              </li>
            ) : (
              items.map((n) => {
                const t = TYPE_ICON[n.type] ?? TYPE_ICON.status;
                const Icon = t.icon;
                return (
                  <li key={n.id}>
                    <Link
                      to={n.link ?? '#'}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-ink-50 ${n.read ? '' : 'bg-signal-50/40'}`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.cls}`}>
                        <Icon size={17} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <span className="truncate">{n.title}</span>
                          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-signal-500" aria-label="unread" />}
                        </p>
                        <p className="line-clamp-2 text-sm text-ink-500">{n.body}</p>
                        <p className="mt-0.5 text-xs text-ink-400">{timeAgo(n.at, now)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          <div className="space-y-2 border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
            {desktopSupported && desktopPerm === 'default' && (
              <button
                onClick={async () => setDesktopPerm(await Notification.requestPermission())}
                className="text-xs font-semibold text-signal-600 hover:text-signal-700"
              >
                Enable desktop alerts when this tab is in the background
              </button>
            )}
            <p className="text-[11px] text-ink-400">Notifications are kept for this session only and clear on refresh.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
