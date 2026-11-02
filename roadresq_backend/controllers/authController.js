import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ROLES = ['user', 'mechanic'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Case-insensitive match so legacy mixed-case emails keep working
const EMAIL_COLLATION = { locale: 'en', strength: 2 };

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

// @route   POST /api/auth/register
export const register = async (req, res) => {
    try {
      const { name, email, phone, password, role = 'user' } = req.body ?? {};

      if (![name, email, phone, password].every((v) => typeof v === 'string' && v.trim())) {
        return res.status(400).json({ message: 'Name, email, phone and password are required' });
      }
      if (!EMAIL_RE.test(email.trim())) {
        return res.status(400).json({ message: 'Invalid email address' });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists
      const userExists = await User.findOne({ email: normalizedEmail }).collation(EMAIL_COLLATION);
      if (userExists) return res.status(400).json({ message: 'User already exists' });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password: hashedPassword,
        role,
      });

      // Generate token
      const token = generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: toPublicUser(user),
        token,
      });
    } catch (err) {
      console.error('Registration Error:', err.message);
      res.status(500).json({ message: 'Error registering user' });
    }
  };


// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.trim() }).collation(EMAIL_COLLATION);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      user: toPublicUser(user),
      token,
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Login failed' });
  }
};
