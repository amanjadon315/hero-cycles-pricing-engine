// app.js
// Builds and returns the Express app, without starting a listener.
// Separated from server.js so tests can import the app and bind it to an
// ephemeral port instead of the real one.
//
// In production, also serves the built React frontend as static files so
// Railway only needs to run one process (no separate frontend server).

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { partsRouter } from './routes/parts.js';
import { modelsRouter } from './routes/models.js';
import { configurationsRouter } from './routes/configurations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');


export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/parts', partsRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/configurations', configurationsRouter);

  // Serve built React app in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(FRONTEND_DIST));
    // For client-side routing — serve index.html for any non-API route
    app.get('*', (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  }
  if (process.env.NODE_ENV === 'production') {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

  

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
