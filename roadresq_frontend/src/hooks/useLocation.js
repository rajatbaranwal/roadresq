import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import socket from '../socket';
import { useSocketEvent, useResyncOnReconnect } from './useSocket';
import { getLocationShareState, subscribeLocationShare } from '../services/locationShare';

// Re-render periodically (for "updated 12s ago" labels)
export const useNow = (intervalMs = 5000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
};

// Mechanic side: state of the location-sharing service
export const useLocationShare = () => useSyncExternalStore(subscribeLocationShare, getLocationShareState);

// Customer side: the assigned mechanic's live position for one request.
// Returns { location, stopped } where location is the last real update (or null).
export const useMechanicLocation = (requestId, active) => {
  const [location, setLocation] = useState(null);
  const [stopped, setStopped] = useState(false);

  const load = useCallback(() => {
    if (!requestId || !active || !socket.connected) return;
    socket.timeout(5000).emit('location:get', { requestId }, (err, res) => {
      if (!err && res?.ok) {
        setLocation(res.location);
        setStopped(false);
      }
    });
  }, [requestId, active]);

  useEffect(() => {
    if (!active) {
      setLocation(null);
      return;
    }
    load();
  }, [active, load]);

  useResyncOnReconnect(load);

  useSocketEvent('location:mechanic', (loc) => {
    if (loc.requestId !== requestId) return;
    setLocation(loc);
    setStopped(false);
  });

  useSocketEvent('location:stopped', ({ requestId: id }) => {
    if (id !== requestId) return;
    setStopped(true);
  });

  return { location: active ? location : null, stopped };
};
