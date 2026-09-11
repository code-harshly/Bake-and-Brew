import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { db } from './server/db.ts';
import {
  authenticatePassword,
  requireAuth,
  requireOwner,
  requireStaff,
  AuthenticatedRequest,
} from './server/auth.ts';

const app = express();
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

app.use(express.json());
app.use(cookieParser());

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

  // --- Auth Routes ---
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { password } = req.body;
      const { token, role } = await authenticatePassword(password);

      // Set stateless httpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/',
      });

      res.json({ success: true, role, token });
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Invalid password' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ role: req.user?.role });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ success: true });
  });

  // --- Staff Billing Routes (Strictly Staff Only) ---
  // Owner calling these receives 403 Forbidden
  app.get('/api/staff/products', requireStaff, async (req, res) => {
    try {
      const products = await db.getProducts();
      res.json({ products });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load products' });
    }
  });

  app.post('/api/staff/checkout', requireStaff, async (req, res) => {
    try {
      const { items, paymentMethod } = req.body;
      const sale = await db.checkoutAtomic({ items, paymentMethod });
      res.status(201).json({ success: true, sale });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Checkout failed' });
    }
  });

  // --- Owner Inventory & Reports Routes (Strictly Owner Only) ---
  // Staff calling these receives 403 Forbidden
  app.get('/api/owner/inventory', requireOwner, async (req, res) => {
    try {
      const products = await db.getProducts();
      res.json({ products });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load inventory' });
    }
  });

  app.post('/api/owner/inventory', requireOwner, async (req, res) => {
    try {
      const { name, category, price, current_stock, low_stock_threshold } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Product name is required.' });
      }
      if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
        return res.status(400).json({ error: 'Valid positive price is required.' });
      }
      if (current_stock === undefined || isNaN(Number(current_stock)) || Number(current_stock) < 0) {
        return res.status(400).json({ error: 'Valid stock count is required.' });
      }

      const product = await db.createProduct({
        name,
        category: category || 'other',
        price: Number(price),
        current_stock: Number(current_stock),
        low_stock_threshold: Number(low_stock_threshold || 10),
      });

      res.status(201).json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create product' });
    }
  });

  app.put('/api/owner/inventory/:id', requireOwner, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await db.updateProduct(id, req.body);
      res.json({ success: true, product: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update product' });
    }
  });

  app.delete('/api/owner/inventory/:id', requireOwner, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ success: true, message: 'Product deleted' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete product' });
    }
  });

  app.get('/api/owner/reports', requireOwner, async (req, res) => {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Invalid year or month parameter' });
      }

      const report = await db.getMonthlyReport(year, month);
      res.json({ report });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate report' });
    }
  });

// Production static assets are served by Vercel's output directory. Keep the
// same middleware for `npm run start` and as a fallback for self-hosted use.
if (isProduction) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export { app };
export default app;

export async function startServer(): Promise<void> {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Bake & Brew server running at http://0.0.0.0:${port}`);
  });
}

const isMainModule =
  typeof require !== 'undefined'
    ? require.main === module
    : path.basename(process.argv[1] ?? '') === 'server.ts';
if (isMainModule) {
  void startServer();
}
