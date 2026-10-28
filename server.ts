import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/router.js';
import { getDb } from './src/server/db.js';

// Ensure HMR is disabled in AI Studio container per environment constraints
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: http: wss: ws: data: blob:;"
    );
    next();
  });

  // CSRF Origin Protection for State-changing API requests
  app.use((req, res, next) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api')) {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          // allow same host or local/dev environments
          if (originHost !== host && !originHost.includes('localhost') && !originHost.includes('127.0.0.1') && !originHost.includes('run.app')) {
            res.status(403).json({ error: 'Cross-site request blocked.' });
            return;
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // Ensure transaction proofs storage directories exist
  const proofsDir = path.resolve(process.cwd(), 'data', 'transaction_proofs');
  const altProofsDir = path.resolve(process.cwd(), 'data', 'transaction proofs');
  if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir, { recursive: true });
  if (!fs.existsSync(altProofsDir)) fs.mkdirSync(altProofsDir, { recursive: true });

  // Serve transaction proofs
  app.use('/transaction_proofs', express.static(proofsDir));
  app.use('/transaction%20proofs', express.static(altProofsDir));
  app.use('/transaction proofs', express.static(altProofsDir));

  // Initialize DB
  await getDb();

  // Direct project zip download endpoints with forced attachment headers
  const serveProjectZip = (_req: express.Request, res: express.Response) => {
    const zipPath = path.resolve(process.cwd(), 'public', 'cutline-studio-project.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="cutline-studio-project.zip"');
      res.sendFile(zipPath);
    } else {
      res.status(404).send('Project ZIP file not found.');
    }
  };

  app.get('/download', serveProjectZip);
  app.get('/download.zip', serveProjectZip);
  app.get('/cutline-studio-project.zip', serveProjectZip);
  app.get('/api/download-zip', serveProjectZip);

  // Mount API routes
  app.use('/api', apiRouter);

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true'
          ? false
          : {
              server,
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cutline Studio] Server running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch(err => {
  console.error('[Cutline Studio] Startup error:', err);
  process.exit(1);
});
