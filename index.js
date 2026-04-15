import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import patientsRouter from './routes/patients.js';
import techniquesRouter from './routes/techniques.js';
import calculationsRouter from './routes/calculations.js';
import seedRouter from './routes/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/patients', patientsRouter);
app.use('/api/techniques', techniquesRouter);
app.use('/api/calculations', calculationsRouter);
app.use('/api/seed', seedRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at /api/patients, /api/techniques, /api/calculations, /api/seed`);
});