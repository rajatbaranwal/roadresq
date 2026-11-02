import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Shared by REST (authMiddleware) and Socket.IO (socket handshake auth).
// Throws on invalid/expired token; resolves to null if the user no longer exists.
export const getUserFromToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(decoded.id).select('-password');
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    if (!expired) console.error('authMiddleware error:', err.message);
    res.status(401).json({ message: expired ? 'Unauthorized: Token expired' : 'Unauthorized: Invalid token' });
  }
};

export default authMiddleware;
