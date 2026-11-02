import express from 'express';
import { register, login } from '../controllers/authController.js';
import rateLimit from '../middlewares/rateLimit.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT) || 20,
  message: 'Too many attempts, please try again later.',
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
