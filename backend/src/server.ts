import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { scanRouter } from './routes/scans.js';
import { targetsRouter } from './routes/targets.js';
import { findingsRouter } from './routes/findings.js';
import { policiesRouter } from './routes/policies.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/scans', scanRouter);
app.use('/api/targets', targetsRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/policies', policiesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
