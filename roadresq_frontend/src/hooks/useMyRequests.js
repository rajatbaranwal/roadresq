import { useCallback, useEffect, useState } from 'react';
import API from '../utils/api';
import { useSocketEvent, useResyncOnReconnect } from './useSocket';
import { upsertRequest } from '../utils/status';

// Customer's own requests (GET /help/mine), kept live via `status-update`
const useMyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await API.get('/help/mine');
      setRequests(res.data.requests);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch my requests:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Could not load your requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useResyncOnReconnect(fetchRequests);

  useSocketEvent('status-update', ({ requestId, newStatus, request }) => {
    setRequests((prev) =>
      request
        ? upsertRequest(prev, request)
        : prev.map((r) => (r._id === requestId ? { ...r, status: newStatus } : r))
    );
  });

  return { requests, loading, error, refresh: fetchRequests };
};

export default useMyRequests;
