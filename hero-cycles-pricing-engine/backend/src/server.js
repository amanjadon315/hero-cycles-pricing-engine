// server.js
import { initSchema } from './db.js';
import { buildApp } from './app.js';

const PORT = process.env.PORT || 4000;

initSchema();

const app = buildApp();

app.listen(PORT, () => {
  console.log(`Hero Cycles pricing engine API running on http://localhost:${PORT}`);
});
