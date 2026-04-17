import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import type { AddressInfo } from 'node:net';
import { scanRouter } from './routes/scans.js';
import { targetsRouter } from './routes/targets.js';
import { findingsRouter } from './routes/findings.js';
import { policiesRouter } from './routes/policies.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use('/api/scans', scanRouter);
app.use('/api/targets', targetsRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/policies', policiesRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  const address = server.address() as AddressInfo | null;
  console.log(`Backend server running on port ${address?.port ?? PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Backend port ${PORT} is already in use. Stop the existing process or run with a different PORT.`);
    process.exit(1);
  }

  console.error('Backend server failed to start:', error.message);
  process.exit(1);
});
