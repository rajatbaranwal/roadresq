import 'dotenv/config'; // must be first so env is loaded before other modules read it
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import { createApp } from './app.js';

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable ${key}`);
    process.exit(1);
  }
}

// Comma-separated list of allowed frontend origins (REST + Socket.IO)
const origins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (origins.length === 0) {
  origins.push('http://localhost:5173');
  console.warn('⚠ CLIENT_ORIGIN not set, allowing only http://localhost:5173');
}

connectDB();

const { server, io } = createApp({ origins });

// ✅ Start server
const PORT = process.env.PORT || 5050;

// Bind to all network interfaces so Render can access it
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT} (allowed origins: ${origins.join(', ')})`);
});

// Render/containers send SIGTERM on deploy/restart: close sockets cleanly
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  io.close(() => {
    mongoose.connection.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
