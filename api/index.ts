import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const api = express();
const JWT_SECRET = process.env.JWT_SECRET || 'bake-and-brew-jwt-secret-key-prod-2026';

api.use(express.json());
api.use(cookieParser());

api.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

api.post('/api/auth/login', (req, res) => {
  const { password } = req.body ?? {};
  let role: 'owner' | 'staff' | undefined;

  if (password === 'owner123') role = 'owner';
  if (password === 'staff123') role = 'staff';

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
    if (user.role !== 'owner' && user.role !== 'staff') {
      throw new Error('Invalid role');
    }
    res.json({ role: user.role });
  } catch {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
});

api.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});

api.use(async (req, res, next) => {
  try {
    const { app } = await import('../server');
    app(req, res, next);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Database API unavailable. Verify the Vercel DATABASE_URL setting.',
      });
    }
  }
});

export default api;
