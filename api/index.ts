import express from 'express';
import cors from 'cors';
import { PORT } from './config';
import apiRoutes from './routes';
import { initSeedData } from './seed';
import './types';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

async function startServer() {
  try {
    await initSeedData();
    app.listen(PORT, () => {
      console.log(`[server] API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[server] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
