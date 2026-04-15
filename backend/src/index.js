// backend/src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import patientsRouter   from './routes/patients.js';
import techniquesRouter from './routes/techniques.js';

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Allowed origins ───────────────────────────────────────────────────────────
// FRONTEND_ORIGIN can be a comma-separated list for multi-origin support.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (same-origin, curl, Postman, Vercel preview)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors());          // Pre-flight for all routes
app.use(express.json({ limit: '2mb' }));

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use('/api/patients',   patientsRouter);
app.use('/api/techniques', techniquesRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Startup — listen only when NOT running on Vercel (serverless) ─────────────
// Vercel imports this file as a module and calls it per request.
// On Railway / local dev the VERCEL env var is absent, so we listen normally.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ LiverRisk API running on http://localhost:${PORT}`);
    console.log(`   Frontend origin: ${allowedOrigins.join(', ')}`);
  });
}

// Export for Vercel serverless handler
export default app;
