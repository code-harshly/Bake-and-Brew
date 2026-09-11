import type { Request, Response } from 'express';

let appPromise: Promise<(req: Request, res: Response) => unknown> | undefined;

export default async function handler(req: Request, res: Response) {
  try {
    appPromise ??= import('../server.ts').then(({ app }) => app);
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.status(500).json({ error: 'API initialization failed' });
  }
}
