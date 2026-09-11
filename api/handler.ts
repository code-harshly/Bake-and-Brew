import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { app as databaseApp } from '../server.ts';

const api = express();
const JWT_SECRET = process.env.JWT_SECRET || 'bake-and-brew-jwt-secret-key-prod-2026';

api.use(express.json());
api.use(cookieParser());

api.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

api.post('/api/auth/login', (req, res) => {
  const { password } = req.body ?? {};
  const role = password === 'owner123' ? 'owner' : password === 'staff123' ? 'staff' : undefined;

  if (!role) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ success: true, role, token });
});

api.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return;
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as { role?: 'owner' | 'staff' };
    if (user.role !== 'owner' && user.role !== 'staff') throw new Error('Invalid role');
    res.json({ role: user.role });
  } catch {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
});

api.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});

api.use((req, res, next) => {
  databaseApp(req, res, next);
});

export default api;
