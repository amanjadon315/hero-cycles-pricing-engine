// app.js
// Builds and returns the Express app, without starting a listener.
// Separated from server.js so tests can import the app and bind it to an
// ephemeral port instead of the real one.

import express from 'express';
import cors from 'cors';
import { partsRouter } from './routes/parts.js';
import { modelsRouter } from './routes/models.js';
import { configurationsRouter } from './routes/configurations.js';

export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/parts', partsRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/configurations', configurationsRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
