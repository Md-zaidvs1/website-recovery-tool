import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environmental parameters
dotenv.config();

import authRoutes from './server/routes/auth';
import domainRoutes from './server/routes/domain';
import resultsRoutes from './server/routes/results';
import dashboardRoutes from './server/routes/dashboard';
import bulkRoutes from './server/routes/bulk';
import settingsRoutes from './server/routes/settings';
import { BulkService } from './server/services/BulkService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security and parsing middlewares
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // CORS configuration allowing electron context
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Log API requests
  app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API Mount Points
  app.use('/api/auth', authRoutes);
  app.use('/api/domains', domainRoutes);
  app.use('/api/results', resultsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/bulk', bulkRoutes);
  app.use('/api/settings', settingsRoutes);

  // Initialize BulkService (resume incomplete batches) on startup
  BulkService.init();

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Error]:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An unexpected server-side error occurred',
    });
  });

  // Integrating Frontend Bundler / Server
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Integrating Vite in Development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Serving Production compiled files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(`[Server] Web App Running on: http://localhost:${PORT}`);
    console.log(`[Server] API Host Ingress Active on Port ${PORT}`);
    console.log(`=============================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to initialize server:', err);
  process.exit(1);
});
