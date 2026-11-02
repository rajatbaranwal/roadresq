import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useSocketEvent } from '../hooks/useSocket';
import { serviceMeta } from '../utils/status';

// Session-only notification center (not persisted: cleared on refresh/logout).
const NotificationContext = createContext(null);

const SOUND_KEY = 'rq:sound';
const readSoundPref = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
};

const STATUS_COPY = {
  accepted: (r) => ({ title: 'Mechanic assigned', body: `${r.mechanicId?.name ?? 'A mechanic'} accepted your request.` }),
  'in-progress': (r) => ({ title: 'Work started', body: `${r.mechanicId?.name ?? 'Your mechanic'} is working on your vehicle.` }),
  resolved: () => ({ title: 'Request resolved', body: 'Your assistance request has been marked as resolved.' }),
};

const MAX_ITEMS = 50;
let seq = 0;

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const myId = String(user?.id || user?._id || '');
  const isMechanic = user?.role === 'mechanic';

  const [items, setItems] = useState([]);
  const [soundEnabled, setSoundEnabledState] = useState(readSoundPref);
  const audioRef = useRef(null);

  const setSoundEnabled = useCallback((on) => {
    setSoundEnabledState(on);
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      /* storage unavailable: preference lasts for this session */
    }
  }, []);

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    audioRef.current ??= new Audio('/notification.mp3');
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      /* autoplay blocked until the user interacts with the page */
    });
  }, [soundEnabled]);

  const push = useCallback(
    (item, { toastTone = 'info', sound = false, desktop = false } = {}) => {
      setItems((prev) => [{ id: ++seq, at: new Date().toISOString(), read: false, ...item }, ...prev].slice(0, MAX_ITEMS));
      toast({
        tone: toastTone,
        title: item.title,
        description: item.body,
        action: item.link ? { label: item.actionLabel ?? 'View', to: item.link } : undefined,
      });
      if (sound) playSound();
      if (desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        new Notification(item.title, { body: item.body, icon: '/roadresq.svg', tag: item.tag });
      }
    },
    [toast, playSound]
  );

  // Mechanics: new assistance requests
  useSocketEvent('new-help-request', (req) => {
    if (!isMechanic) return;
    const service = serviceMeta(req.serviceType).label;
    push(
      {
        type: 'request',
        title: 'New assistance request',
        body: `${req.userId?.name ?? 'A customer'} · ${service} · ${req.urgency ?? 'Medium'} urgency`,
        link: '/dashboard/mechanic',
        actionLabel: 'Review request',
        tag: req._id,
      },
      { toastTone: 'alert', sound: true, desktop: true }
    );
  });

  // Customers: progress on their own requests
  useSocketEvent('status-update', ({ newStatus, request }) => {
    if (isMechanic || !request) return;
    const copy = STATUS_COPY[newStatus]?.(request);
    if (!copy) return;
    push(
      { type: 'status', ...copy, link: '/dashboard', actionLabel: 'Track request', tag: request._id },
      { toastTone: newStatus === 'resolved' ? 'success' : 'info', sound: true, desktop: true }
    );
  });

  // Chat messages that arrive while that conversation is not on screen
  useSocketEvent('receiveMessage', (msg) => {
    if (msg.senderId === myId) return; // my own message from another tab
    const viewing =
      location.pathname === '/chat' && new URLSearchParams(location.search).get('request') === msg.requestId;
    if (viewing) return;
    push(
      {
        type: 'message',
        title: `Message from ${msg.senderName ?? (isMechanic ? 'customer' : 'mechanic')}`,
        body: msg.message,
        link: `/chat?request=${msg.requestId}`,
        actionLabel: 'Open chat',
      },
      { toastTone: 'info', desktop: true }
    );
  });

  const markAllRead = useCallback(() => setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true }))), []);
  const markRead = useCallback((id) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const clearAll = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      markAllRead,
      markRead,
      clearAll,
      soundEnabled,
      setSoundEnabled,
    }),
    [items, markAllRead, markRead, clearAll, soundEnabled, setSoundEnabled]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
