import { Server } from 'socket.io';
import mongoose from 'mongoose';

import { getUserFromToken } from '../middlewares/authMiddleware.js';
import HelpRequest from '../models/HelpRequest.js';

export const MECHANICS_ROOM = 'mechanics';
export const userRoom = (id) => `user:${String(id)}`;

// Statuses during which chat and live location sharing are allowed
const ACTIVE_STATUSES = ['accepted', 'in-progress'];
const MAX_MESSAGE_LENGTH = 1000;
const MESSAGE_WINDOW_MS = 10 * 1000;
const MESSAGES_PER_WINDOW = 20;
const TYPING_MIN_INTERVAL_MS = 500;
const LOCATION_MIN_INTERVAL_MS = 2000;
const PARTICIPANTS_CACHE_MS = 10 * 1000;
const LOCATION_TTL_MS = 60 * 60 * 1000;

// Last known mechanic position per active request. In memory only (never stored
// in MongoDB); cleared when the job ends. Single-instance, like the socket adapter.
const lastLocations = new Map();

const debugEnabled = () => process.env.SOCKET_DEBUG === '1';
const log = (...args) => console.log(new Date().toISOString(), '[socket]', ...args);
const debug = (...args) => debugEnabled() && log('[debug]', ...args);

// Reject handshake unless it carries a valid JWT in `auth.token`
const authenticate = async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    log(`auth rejected sid=${socket.id} reason=no-token`);
    return next(new Error('UNAUTHORIZED'));
  }

  try {
    const user = await getUserFromToken(token);
    if (!user) {
      log(`auth rejected sid=${socket.id} reason=user-not-found`);
      return next(new Error('UNAUTHORIZED'));
    }
    socket.data.user = { id: String(user._id), name: user.name, role: user.role };
    next();
  } catch (err) {
    log(`auth rejected sid=${socket.id} reason=${err.name}`);
    next(new Error(err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED'));
  }
};

// Simple per-socket fixed-window throttle for chat messages
const allowMessage = (socket) => {
  const now = Date.now();
  const rl = socket.data.rl;
  if (!rl || rl.resetAt <= now) {
    socket.data.rl = { count: 1, resetAt: now + MESSAGE_WINDOW_MS };
    return true;
  }
  rl.count += 1;
  return rl.count <= MESSAGES_PER_WINDOW;
};

// Minimum interval between events of one kind on one socket
const allowEvery = (socket, key, intervalMs) => {
  const now = Date.now();
  socket.data.lastAt ??= {};
  if (now - (socket.data.lastAt[key] ?? 0) < intervalMs) return false;
  socket.data.lastAt[key] = now;
  return true;
};

const isUserOnline = (io, userId) => (io.of('/').adapter.rooms.get(userRoom(userId))?.size ?? 0) > 0;

// Who is involved in a request, and is the sender one of them?
// Returns { customerId, mechanicId, status, otherId } or { error }.
const loadParticipants = async (requestId, senderId) => {
  if (!mongoose.isValidObjectId(requestId)) return { error: 'Invalid request id' };
  const request = await HelpRequest.findById(requestId).select('userId mechanicId status').lean();
  if (!request) return { error: 'Help request not found' };

  const customerId = String(request.userId);
  const mechanicId = request.mechanicId ? String(request.mechanicId) : null;
  if (senderId !== customerId && senderId !== mechanicId) return { error: 'You are not part of this request' };

  return {
    customerId,
    mechanicId,
    status: request.status,
    otherId: senderId === customerId ? mechanicId : customerId,
  };
};

// Short-lived per-socket cache for high-frequency, low-risk events (typing)
const cachedParticipants = async (socket, requestId) => {
  socket.data.participants ??= new Map();
  const hit = socket.data.participants.get(requestId);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await loadParticipants(requestId, socket.data.user.id);
  socket.data.participants.set(requestId, { value, expires: Date.now() + PARTICIPANTS_CACHE_MS });
  return value;
};

const handleSendMessage = (io, socket) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  const sender = socket.data.user;

  try {
    const { requestId, message } = payload ?? {};
    const text = typeof message === 'string' ? message.trim() : '';

    if (!mongoose.isValidObjectId(requestId)) return reply({ ok: false, error: 'Invalid request id' });
    if (!text) return reply({ ok: false, error: 'Message is empty' });
    if (text.length > MAX_MESSAGE_LENGTH) return reply({ ok: false, error: 'Message is too long' });
    if (!allowMessage(socket)) return reply({ ok: false, error: 'You are sending messages too fast' });

    // Always a fresh lookup: chat must close the moment a request is resolved
    const p = await loadParticipants(requestId, sender.id);
    if (p.error) {
      log(`chat denied sid=${socket.id} user=${sender.id} request=${requestId} reason=${p.error}`);
      return reply({ ok: false, error: p.error });
    }
    if (!p.mechanicId || !ACTIVE_STATUSES.includes(p.status)) {
      return reply({ ok: false, error: 'Chat is available only while a mechanic is assigned' });
    }

    const outgoing = {
      requestId: String(requestId),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      message: text,
      sentAt: new Date().toISOString(),
    };

    // Deliver to every tab of the receiver and to the sender's *other* tabs
    socket.to([userRoom(p.otherId), userRoom(sender.id)]).emit('receiveMessage', outgoing);
    debug(`chat request=${requestId} ${sender.id} -> ${p.otherId}`);
    // `delivered` = the receiver had at least one connected device when sent
    reply({ ok: true, message: outgoing, delivered: isUserOnline(io, p.otherId) });
  } catch (err) {
    log(`chat error sid=${socket.id} user=${sender.id}:`, err.message);
    reply({ ok: false, error: 'Failed to send message' });
  }
};

const handleTyping = (socket) => async (payload) => {
  const { requestId, isTyping } = payload ?? {};
  const typing = Boolean(isTyping);
  // "stop typing" is always let through so indicators never get stuck
  if (typing && !allowEvery(socket, 'typing', TYPING_MIN_INTERVAL_MS)) return;

  try {
    const p = await cachedParticipants(socket, String(requestId));
    if (p.error || !p.otherId || !ACTIVE_STATUSES.includes(p.status)) return;
    socket.to(userRoom(p.otherId)).emit('typing', {
      requestId: String(requestId),
      userId: socket.data.user.id,
      name: socket.data.user.name,
      isTyping: typing,
    });
  } catch (err) {
    log(`typing error sid=${socket.id}:`, err.message);
  }
};

const inRange = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const optional = (v, min, max) => (inRange(v, min, max) ? v : null);

const handleLocationUpdate = (socket) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  const { id: userId, role } = socket.data.user;

  try {
    const { requestId, lat, lng, accuracy, heading, speed } = payload ?? {};
    if (role !== 'mechanic') return reply({ ok: false, error: 'Only mechanics share location' });
    if (!inRange(lat, -90, 90) || !inRange(lng, -180, 180)) return reply({ ok: false, error: 'Invalid coordinates' });
    if (!allowEvery(socket, 'location', LOCATION_MIN_INTERVAL_MS)) return reply({ ok: false, error: 'throttled' });

    // Fresh lookup: sharing must stop as soon as the job is resolved or reassigned
    const p = await loadParticipants(requestId, userId);
    if (p.error) return reply({ ok: false, error: p.error });
    if (p.mechanicId !== userId || !ACTIVE_STATUSES.includes(p.status)) {
      return reply({ ok: false, error: 'Location can be shared only for your active job' });
    }

    const location = {
      requestId: String(requestId),
      lat,
      lng,
      accuracy: optional(accuracy, 0, 100000),
      heading: optional(heading, 0, 360),
      speed: optional(speed, 0, 200),
      updatedAt: new Date().toISOString(),
    };
    lastLocations.set(location.requestId, location);

    // Only the customer of this request receives the mechanic's position
    socket.to(userRoom(p.customerId)).emit('location:mechanic', location);
    debug(`location request=${requestId} from mechanic=${userId}`);
    reply({ ok: true, updatedAt: location.updatedAt });
  } catch (err) {
    log(`location error sid=${socket.id}:`, err.message);
    reply({ ok: false, error: 'Failed to share location' });
  }
};

const handleLocationGet = (socket) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  try {
    const requestId = String(payload?.requestId);
    const p = await loadParticipants(requestId, socket.data.user.id);
    if (p.error) return reply({ ok: false, error: p.error });
    if (!ACTIVE_STATUSES.includes(p.status)) return reply({ ok: true, location: null });
    reply({ ok: true, location: lastLocations.get(requestId) ?? null });
  } catch (err) {
    log(`location:get error sid=${socket.id}:`, err.message);
    reply({ ok: false, error: 'Failed to load location' });
  }
};

const handleLocationStop = (socket) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  try {
    const requestId = String(payload?.requestId);
    const p = await loadParticipants(requestId, socket.data.user.id);
    if (p.error || p.mechanicId !== socket.data.user.id) return reply({ ok: false, error: p.error || 'Not your job' });
    lastLocations.delete(requestId);
    socket.to(userRoom(p.customerId)).emit('location:stopped', { requestId, reason: 'stopped' });
    reply({ ok: true });
  } catch (err) {
    log(`location:stop error sid=${socket.id}:`, err.message);
    reply({ ok: false, error: 'Failed to stop sharing' });
  }
};

// Mechanic toggles whether they receive new-request alerts
const handleAvailability = (socket) => (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  if (socket.data.user.role !== 'mechanic') return reply({ ok: false, error: 'Only mechanics' });
  const available = payload?.available !== false;
  if (available) socket.join(MECHANICS_ROOM);
  else socket.leave(MECHANICS_ROOM);
  log(`availability user=${socket.data.user.id} available=${available}`);
  reply({ ok: true, available });
};

export const initSocket = (server, { origins }) => {
  const io = new Server(server, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Restores rooms + missed events after brief network drops (no re-auth needed)
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  io.use(authenticate);

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.data.user;

    // Rooms are derived from the verified token, never from client input,
    // and are re-joined automatically on every (re)connection.
    if (!socket.recovered) {
      socket.join(userRoom(userId));
      if (role === 'mechanic') socket.join(MECHANICS_ROOM);
    }

    log(
      `connect sid=${socket.id} user=${userId} role=${role} ` +
        `transport=${socket.conn.transport.name} recovered=${socket.recovered}`
    );

    if (debugEnabled()) {
      socket.onAny((event) => debug(`event "${event}" from user=${userId}`));
    }

    socket.on('sendMessage', handleSendMessage(io, socket));
    socket.on('typing', handleTyping(socket));
    socket.on('location:update', handleLocationUpdate(socket));
    socket.on('location:get', handleLocationGet(socket));
    socket.on('location:stop', handleLocationStop(socket));
    socket.on('mechanic:availability', handleAvailability(socket));

    socket.on('disconnect', (reason) => {
      log(`disconnect sid=${socket.id} user=${userId} reason=${reason}`);
    });
  });

  io.engine.on('connection_error', (err) => {
    log(`engine connection_error code=${err.code} message=${err.message}`);
  });

  // Drop locations of jobs nobody updated for a long time
  const sweep = setInterval(() => {
    const cutoff = Date.now() - LOCATION_TTL_MS;
    for (const [id, loc] of lastLocations) {
      if (Date.parse(loc.updatedAt) < cutoff) lastLocations.delete(id);
    }
  }, LOCATION_TTL_MS / 4);
  sweep.unref();

  return io;
};

// --- Server -> client notifications (called from controllers) ---

export const notifyNewRequest = (io, request) => {
  io.to(MECHANICS_ROOM).emit('new-help-request', request);
};

// Full request goes to the customer and the assigned mechanic; other mechanics
// only get enough to drop it from their list (no customer details).
export const notifyStatusUpdate = (io, request) => {
  const customerId = String(request.userId?._id ?? request.userId);
  const mechanicId = request.mechanicId ? String(request.mechanicId._id ?? request.mechanicId) : null;
  const summary = { requestId: String(request._id), newStatus: request.status, mechanicId };
  const participantRooms = [userRoom(customerId), ...(mechanicId ? [userRoom(mechanicId)] : [])];

  io.to(participantRooms).emit('status-update', { ...summary, request });
  io.to(MECHANICS_ROOM).except(participantRooms).emit('status-update', summary);

  // Job finished: stop live tracking for everyone involved
  if (!ACTIVE_STATUSES.includes(request.status) && lastLocations.delete(String(request._id))) {
    io.to(participantRooms).emit('location:stopped', { requestId: String(request._id), reason: request.status });
  }
};
