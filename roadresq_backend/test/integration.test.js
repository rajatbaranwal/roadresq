// Integration tests: real Express app + Socket.IO + in-memory MongoDB.
// Run with `npm test`.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';

process.env.JWT_SECRET = 'test-secret-for-integration-tests';
process.env.AUTH_RATE_LIMIT = '1000';

const { createApp } = await import('../app.js');

let mongo;
let server;
let io;
let BASE;
const sockets = [];

const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const registerUser = async (name, role) => {
  const { status, data } = await api('POST', '/auth/register', {
    body: { name, email: `${name}@test.dev`, phone: '9999999999', password: 'secret123', role },
  });
  assert.equal(status, 201, JSON.stringify(data));
  return { ...data.user, token: data.token };
};

const connect = (token, opts = {}) => {
  const s = ioClient(BASE, {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelay: 50,
    reconnectionDelayMax: 100,
    forceNew: true,
    ...opts,
  });
  sockets.push(s);
  return s;
};

const once = (emitter, event, ms = 2000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    // With connectionStateRecovery, Socket.IO appends an offset arg; payload is always first
    emitter.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });

const connected = async (token) => {
  const s = connect(token);
  await once(s, 'connect');
  return s;
};

// Collects every payload of `event` received by a socket
const record = (s, event) => {
  const got = [];
  s.on(event, (p) => got.push(p));
  return got;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendMessage = (s, payload) =>
  new Promise((resolve) => s.timeout(2000).emit('sendMessage', payload, (err, res) => resolve(err ? { ok: false, error: 'ack timeout' } : res)));

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  ({ server, io } = createApp({ origins: ['http://localhost:5173'] }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => io.close(r));
  await mongoose.disconnect();
  await mongo.stop();
});

describe('auth REST', () => {
  test('register validates input', async () => {
    const r1 = await api('POST', '/auth/register', { body: { email: 'x@test.dev' } });
    assert.equal(r1.status, 400);
    const r2 = await api('POST', '/auth/register', {
      body: { name: 'a', email: 'bad', phone: '1', password: 'secret123' },
    });
    assert.equal(r2.status, 400);
    const r3 = await api('POST', '/auth/register', {
      body: { name: 'a', email: 'a@test.dev', phone: '1', password: 'secret123', role: 'admin' },
    });
    assert.equal(r3.status, 400);
  });

  test('login is case-insensitive on email and returns phone', async () => {
    await registerUser('casey', 'user');
    const { status, data } = await api('POST', '/auth/login', {
      body: { email: 'CASEY@Test.dev', password: 'secret123' },
    });
    assert.equal(status, 200);
    assert.equal(data.user.phone, '9999999999');
    assert.ok(data.token);
  });

  test('duplicate email (different case) is rejected', async () => {
    const { status } = await api('POST', '/auth/register', {
      body: { name: 'c2', email: 'Casey@TEST.dev', phone: '1', password: 'secret123' },
    });
    assert.equal(status, 400);
  });

  test('errors do not leak internals', async () => {
    const { status, data } = await api('POST', '/auth/login', { body: { email: 'nobody@test.dev', password: 'x' } });
    assert.equal(status, 401);
    assert.equal(data.error, undefined);
  });
});

describe('end-to-end workflow with sockets', () => {
  let C1, C2, M1, M2;
  let c1, c1b, c2, m1, m2;
  let requestId;

  before(async () => {
    C1 = await registerUser('cust1', 'user');
    C2 = await registerUser('cust2', 'user');
    M1 = await registerUser('mech1', 'mechanic');
    M2 = await registerUser('mech2', 'mechanic');
    [c1, c1b, c2, m1, m2] = await Promise.all([
      connected(C1.token),
      connected(C1.token), // second tab of the same customer
      connected(C2.token),
      connected(M1.token),
      connected(M2.token),
    ]);
  });

  test('socket rejects missing, invalid and expired tokens', async () => {
    const noToken = connect(undefined);
    assert.equal((await once(noToken, 'connect_error')).message, 'UNAUTHORIZED');
    assert.equal(noToken.active, false, 'client must not keep retrying after auth failure');

    const bad = connect('not-a-jwt');
    assert.equal((await once(bad, 'connect_error')).message, 'UNAUTHORIZED');

    const expiredToken = jwt.sign({ id: M1.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const expired = connect(expiredToken);
    assert.equal((await once(expired, 'connect_error')).message, 'TOKEN_EXPIRED');
  });

  test('connection to an unreachable server reports connect_error', async () => {
    const s = ioClient('http://127.0.0.1:1', { transports: ['websocket'], reconnection: false });
    sockets.push(s);
    const err = await once(s, 'connect_error', 5000);
    assert.ok(err instanceof Error);
  });

  test('REST role checks', async () => {
    assert.equal((await api('GET', '/help/all')).status, 401);
    assert.equal((await api('GET', '/help/all', { token: C1.token })).status, 403);
    assert.equal((await api('GET', '/help/mine', { token: M1.token })).status, 403);
    assert.equal(
      (await api('POST', '/help/request', { token: M1.token, body: { vehicleType: 'Car', description: 'x', location: '1,2' } })).status,
      403
    );
    assert.equal((await api('PATCH', '/help/000000000000000000000000/status', { token: C1.token, body: { status: 'accepted' } })).status, 403);
  });

  test('create request validates body', async () => {
    const { status } = await api('POST', '/help/request', { token: C1.token, body: { vehicleType: 'Car' } });
    assert.equal(status, 400);
  });

  test('new-help-request goes to all mechanics (populated) and to no customers', async () => {
    const custGot = [...[c1, c1b, c2].map((s) => record(s, 'new-help-request'))];
    const pM1 = once(m1, 'new-help-request');
    const pM2 = once(m2, 'new-help-request');

    const { status, data } = await api('POST', '/help/request', {
      token: C1.token,
      body: { vehicleType: 'Car', description: 'Flat tyre', location: '12.9,77.6', urgency: 'High' },
    });
    assert.equal(status, 201);
    requestId = data.helpRequest._id;

    const [e1, e2] = await Promise.all([pM1, pM2]);
    assert.equal(e1._id, requestId);
    assert.equal(e1.userId.name, 'cust1', 'payload must be populated');
    assert.equal(e1.userId.phone, undefined, 'no customer contact details before acceptance');
    assert.equal(e1.userId.email, undefined);
    assert.equal(e1.phone, undefined);
    assert.equal(e2._id, requestId);

    await sleep(200);
    custGot.forEach((g) => assert.equal(g.length, 0));
  });

  test('GET /all (mechanic) and /mine (customer) reflect the new request', async () => {
    const all = await api('GET', '/help/all', { token: M1.token });
    assert.ok(all.data.requests.some((r) => r._id === requestId));
    const mine1 = await api('GET', '/help/mine', { token: C1.token });
    assert.deepEqual(mine1.data.requests.map((r) => r._id), [requestId]);
    const mine2 = await api('GET', '/help/mine', { token: C2.token });
    assert.equal(mine2.data.requests.length, 0);
  });

  test('chat is refused before a mechanic is assigned', async () => {
    const res = await sendMessage(c1, { requestId, message: 'hello?' });
    assert.equal(res.ok, false);
  });

  test('accept: customer gets full update, other mechanics get summary only, others nothing', async () => {
    const c2Got = record(c2, 'status-update');
    const pC1 = once(c1, 'status-update');
    const pM2 = once(m2, 'status-update');
    const pM1 = once(m1, 'status-update');

    const { status, data } = await api('PATCH', `/help/${requestId}/status`, {
      token: M1.token,
      body: { status: 'accepted' },
    });
    assert.equal(status, 200);
    assert.equal(data.helpRequest.mechanicId.name, 'mech1');

    const [u1, u2, u3] = await Promise.all([pC1, pM2, pM1]);
    assert.equal(u1.requestId, requestId);
    assert.equal(u1.newStatus, 'accepted');
    assert.equal(u1.mechanicId, M1.id);
    assert.equal(u1.request.mechanicId.name, 'mech1');
    assert.equal(u2.newStatus, 'accepted');
    assert.equal(u2.request, undefined, 'other mechanics must not receive customer details');
    assert.equal(u3.request.userId.name, 'cust1');

    await sleep(200);
    assert.equal(c2Got.length, 0);
  });

  test('another mechanic cannot advance an assigned request; invalid transitions rejected', async () => {
    const r1 = await api('PATCH', `/help/${requestId}/status`, { token: M2.token, body: { status: 'in-progress' } });
    assert.equal(r1.status, 403);
    const r2 = await api('PATCH', `/help/${requestId}/status`, { token: M1.token, body: { status: 'resolved' } });
    assert.equal(r2.status, 400);
    const r3 = await api('PATCH', `/help/${requestId}/accept`, { token: M1.token });
    assert.equal(r3.status, 400, '/accept must respect transitions');
    const r4 = await api('PATCH', `/help/${requestId}/status`, { token: M1.token, body: { status: 'bogus' } });
    assert.equal(r4.status, 400);
  });

  test('GET /:id is limited to participants', async () => {
    assert.equal((await api('GET', `/help/${requestId}`, { token: C1.token })).status, 200);
    assert.equal((await api('GET', `/help/${requestId}`, { token: M1.token })).status, 200);
    assert.equal((await api('GET', `/help/${requestId}`, { token: C2.token })).status, 403);
    assert.equal((await api('GET', `/help/${requestId}`, { token: M2.token })).status, 403);
    assert.equal((await api('GET', '/help/not-an-id', { token: C1.token })).status, 400);
  });

  test('chat: delivered only to participants, sender id cannot be spoofed', async () => {
    const outsiders = [c2, m2].map((s) => record(s, 'receiveMessage'));
    const senderEcho = record(c1, 'receiveMessage');
    const pM1 = once(m1, 'receiveMessage');
    const pC1b = once(c1b, 'receiveMessage');

    const ack = await sendMessage(c1, { requestId, message: '  I am near the toll booth  ', senderId: M2.id });
    assert.equal(ack.ok, true);

    const [toMech, toOtherTab] = await Promise.all([pM1, pC1b]);
    assert.equal(toMech.senderId, C1.id, 'senderId comes from the token, not the payload');
    assert.equal(toMech.senderName, 'cust1');
    assert.equal(toMech.message, 'I am near the toll booth');
    assert.equal(toMech.requestId, requestId);
    assert.equal(toOtherTab.message, 'I am near the toll booth');

    const reply = once(c1, 'receiveMessage');
    assert.equal((await sendMessage(m1, { requestId, message: 'On my way' })).ok, true);
    assert.equal((await reply).senderId, M1.id);

    await sleep(200);
    outsiders.forEach((g) => assert.equal(g.length, 0));
    assert.equal(senderEcho.length, 1, 'sending socket must not get its own message echoed');
  });

  test('chat: non-participants and bad payloads are refused', async () => {
    assert.equal((await sendMessage(m2, { requestId, message: 'hi' })).ok, false);
    assert.equal((await sendMessage(c2, { requestId, message: 'hi' })).ok, false);
    assert.equal((await sendMessage(c1, { requestId, message: '   ' })).ok, false);
    assert.equal((await sendMessage(c1, { requestId, message: 'x'.repeat(1001) })).ok, false);
    assert.equal((await sendMessage(c1, { requestId: 'nope', message: 'hi' })).ok, false);
    assert.equal((await sendMessage(c1, null)).ok, false);
  });

  test('accepted request: assigned mechanic sees contact details, history has timestamps', async () => {
    const all = await api('GET', '/help/all', { token: M1.token });
    const mine = all.data.requests.find((r) => r._id === requestId);
    assert.equal(mine.userId.phone, '9999999999');
    assert.equal(mine.phone, '9999999999');
    assert.deepEqual(mine.statusHistory.map((h) => h.status), ['pending', 'accepted']);
    assert.ok(mine.statusHistory.every((h) => !Number.isNaN(Date.parse(h.at))));
  });

  test('chat ack reports whether the receiver was online', async () => {
    const ack = await sendMessage(m1, { requestId, message: 'online?' });
    assert.equal(ack.ok, true);
    assert.equal(ack.delivered, true);
    assert.equal(ack.message.senderRole, 'mechanic');
  });

  test('typing indicator reaches only the other participant', async () => {
    const outsiders = [c2, m2].map((s) => record(s, 'typing'));
    const p = once(m1, 'typing');
    c1.emit('typing', { requestId, isTyping: true });
    const t = await p;
    assert.deepEqual([t.requestId, t.userId, t.isTyping], [requestId, C1.id, true]);
    m2.emit('typing', { requestId, isTyping: true }); // not a participant: dropped
    await sleep(200);
    outsiders.forEach((g) => assert.equal(g.length, 0));
  });

  test('live location: assigned mechanic -> customer only, validated and throttled', async () => {
    const outsiders = [c2, m2].map((s) => record(s, 'location:mechanic'));
    const pC1 = once(c1, 'location:mechanic');
    const emitLoc = (s, body) => new Promise((r) => s.emit('location:update', body, r));

    const ack = await emitLoc(m1, { requestId, lat: 12.97, lng: 77.59, accuracy: 8, heading: 90 });
    assert.equal(ack.ok, true);
    const loc = await pC1;
    assert.deepEqual([loc.requestId, loc.lat, loc.lng, loc.accuracy, loc.heading], [requestId, 12.97, 77.59, 8, 90]);
    assert.ok(loc.updatedAt);

    assert.equal((await emitLoc(m1, { requestId, lat: 12.98, lng: 77.6 })).error, 'throttled');
    assert.equal((await emitLoc(m2, { requestId, lat: 1, lng: 1 })).ok, false, 'other mechanic refused');
    assert.equal((await emitLoc(c1, { requestId, lat: 1, lng: 1 })).ok, false, 'customers cannot send');
    assert.equal((await emitLoc(m2, { requestId, lat: 999, lng: 1 })).error, 'Invalid coordinates');

    // Late joiner gets the last known position; outsiders cannot read it
    const get = (s) => new Promise((r) => s.emit('location:get', { requestId }, r));
    assert.equal((await get(c1b)).location.lat, 12.97);
    assert.equal((await get(c2)).ok, false);
    assert.equal((await get(m2)).ok, false);

    await sleep(200);
    outsiders.forEach((g) => assert.equal(g.length, 0));
  });

  test('mechanic availability toggles new-request alerts', async () => {
    const off = await new Promise((r) => m2.emit('mechanic:availability', { available: false }, r));
    assert.deepEqual(off, { ok: true, available: false });
    const m2Got = record(m2, 'new-help-request');
    const pM1 = once(m1, 'new-help-request');
    await api('POST', '/help/request', {
      token: C2.token,
      body: { vehicleType: 'Car', description: 'Fuel', location: '5,5', serviceType: 'fuel' },
    });
    assert.equal((await pM1).serviceType, 'fuel');
    await sleep(200);
    assert.equal(m2Got.length, 0);
    assert.equal((await new Promise((r) => m2.emit('mechanic:availability', { available: true }, r))).available, true);
    assert.equal((await new Promise((r) => c1.emit('mechanic:availability', { available: true }, r))).ok, false);
  });

  test('serviceType is validated; stats come from the database', async () => {
    const bad = await api('POST', '/help/request', {
      token: C1.token,
      body: { vehicleType: 'Car', description: 'x', location: '1,1', serviceType: 'teleport' },
    });
    assert.equal(bad.status, 400);
    const { status, data } = await api('GET', '/help/stats', { token: M1.token });
    assert.equal(status, 200);
    assert.equal(data.stats.accepted, 1);
    assert.equal(data.stats.inProgress, 0);
    assert.equal(data.stats.completed, 0);
    assert.ok(data.stats.available >= 1);
    assert.equal((await api('GET', '/help/stats', { token: C1.token })).status, 403);
  });

  test('reconnect after network interruption still receives messages (recovered session)', async () => {
    const dropped = once(m1, 'disconnect');
    const back = once(m1, 'connect', 3000);
    m1.io.engine.transport.ws._socket.destroy(); // simulate network failure (kill raw TCP socket)
    assert.match(await dropped, /^transport (close|error)$/);
    await back;
    assert.equal(m1.recovered, true);

    const p = once(m1, 'receiveMessage');
    assert.equal((await sendMessage(c1, { requestId, message: 'after blip' })).ok, true);
    assert.equal((await p).message, 'after blip');
  });

  test('fresh connection (no recovery, e.g. server restart) re-joins rooms from the token', async () => {
    m1.disconnect();
    m1 = await connected(M1.token); // brand-new session: nothing to recover
    assert.equal(m1.recovered, false);

    const pChat = once(m1, 'receiveMessage');
    assert.equal((await sendMessage(c1, { requestId, message: 'after reconnect' })).ok, true);
    assert.equal((await pChat).message, 'after reconnect');

    // and still in the mechanics room
    const pNew = once(m1, 'new-help-request');
    await api('POST', '/help/request', {
      token: C2.token,
      body: { vehicleType: 'Bike', description: 'Chain', location: '1,1' },
    });
    assert.equal((await pNew).userId.name, 'cust2');
  });

  test('status progresses to resolved, chat and location sharing close afterwards', async () => {
    const stopped = once(c1, 'location:stopped');
    for (const status of ['in-progress', 'resolved']) {
      const p = once(c1, 'status-update');
      const r = await api('PATCH', `/help/${requestId}/status`, { token: M1.token, body: { status } });
      assert.equal(r.status, 200);
      assert.equal((await p).newStatus, status);
    }
    assert.deepEqual(await stopped, { requestId, reason: 'resolved' });
    const loc = await new Promise((r) => c1.emit('location:get', { requestId }, r));
    assert.equal(loc.location, null);
    await sleep(2100); // past the location throttle window
    const late = await new Promise((r) => m1.emit('location:update', { requestId, lat: 1, lng: 1 }, r));
    assert.equal(late.ok, false, 'no sharing after resolution');
    const mine = await api('GET', '/help/mine', { token: C1.token });
    assert.equal(mine.data.requests[0].status, 'resolved');
    assert.equal((await sendMessage(c1, { requestId, message: 'thanks' })).ok, false);
  });

  test('two mechanics accepting at once: exactly one wins', async () => {
    const { data } = await api('POST', '/help/request', {
      token: C1.token,
      body: { vehicleType: 'Truck', description: 'Engine', location: '2,2' },
    });
    const id = data.helpRequest._id;
    const results = await Promise.all([
      api('PATCH', `/help/${id}/status`, { token: M1.token, body: { status: 'accepted' } }),
      api('PATCH', `/help/${id}/status`, { token: M2.token, body: { status: 'accepted' } }),
    ]);
    const codes = results.map((r) => r.status).sort();
    assert.equal(codes[0], 200);
    assert.notEqual(codes[1], 200);
  });

  test('reject hides a pending request only for that mechanic', async () => {
    const { data } = await api('POST', '/help/request', {
      token: C1.token,
      body: { vehicleType: 'Car', description: 'Battery', location: '3,3' },
    });
    const id = data.helpRequest._id;
    assert.equal((await api('PATCH', `/help/${id}/reject`, { token: M2.token })).status, 200);
    const forM2 = await api('GET', '/help/all', { token: M2.token });
    const forM1 = await api('GET', '/help/all', { token: M1.token });
    assert.ok(!forM2.data.requests.some((r) => r._id === id));
    assert.ok(forM1.data.requests.some((r) => r._id === id));
    assert.equal((await api('PATCH', `/help/${id}/reject`, { token: C1.token })).status, 403);

    // Declining mechanics are never revealed to anyone, in any response
    const statsM2 = await api('GET', '/help/stats', { token: M2.token });
    const statsM1 = await api('GET', '/help/stats', { token: M1.token });
    assert.equal(statsM1.data.stats.available - statsM2.data.stats.available, 1, 'stats exclude declined request');
    const mine = await api('GET', '/help/mine', { token: C1.token });
    assert.ok(mine.data.requests.every((r) => !('rejectedBy' in r)), '/mine hides rejectedBy');
    assert.equal('rejectedBy' in (await api('GET', `/help/${id}`, { token: C1.token })).data.request, false);
    assert.equal('rejectedBy' in data.helpRequest, false, 'create response hides rejectedBy');
    assert.ok(forM1.data.requests.every((r) => !('rejectedBy' in r)), '/all hides rejectedBy');

    // ...including the live status-update the customer receives
    const pC1 = once(c1, 'status-update');
    assert.equal((await api('PATCH', `/help/${id}/status`, { token: M1.token, body: { status: 'accepted' } })).status, 200);
    const update = await pC1;
    assert.equal(update.requestId, id);
    assert.equal('rejectedBy' in update.request, false, 'status-update payload hides rejectedBy');
  });

  test('server cleans up sockets and rooms on disconnect', async () => {
    const extra = await connected(C2.token);
    const room = `user:${C2.id}`;
    const before = io.of('/').adapter.rooms.get(room)?.size ?? 0;
    assert.ok(before >= 2);

    extra.disconnect();
    c2.disconnect();
    await sleep(200);
    assert.equal(io.of('/').adapter.rooms.get(room), undefined, 'room removed when all tabs closed');
    assert.ok(![...io.of('/').sockets.values()].some((s) => s.data.user.id === C2.id));
  });
});
