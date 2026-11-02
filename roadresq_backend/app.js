import express from 'express';
import cors from 'cors';
import http from 'http';

import authRoutes from './routes/authRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import { initSocket } from './socket/index.js';

// Builds the Express app + HTTP server + Socket.IO without listening,
// so the same wiring is used by server.js and by the tests.
export const createApp = ({ origins }) => {
  const app = express();
  const server = http.createServer(app); // HTTP server shared with Socket.IO

  // Behind Render/Heroku/nginx, trust X-Forwarded-For so req.ip is the client IP
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

  const io = initSocket(server, { origins });

  // Attach Socket.IO to app so controllers can emit
  app.set('io', io);

  // ✅ Middleware
  app.use(cors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '100kb' }));

  // ✅ Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/help', helpRoutes);

  // ✅ Root Route
  app.get('/', (req, res) => {
    res.send('API is running...');
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Malformed JSON body' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return { app, server, io };
};
