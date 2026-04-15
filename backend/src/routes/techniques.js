// src/routes/techniques.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/techniques
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('techniques')
    .select('*, performances(*), coefficients(*, risk_factors(*))');

  if (error) return res.status(500).json({ error: 'Failed to fetch techniques' });
  res.json({ techniques: data });
});

// GET /api/techniques/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('techniques')
    .select('*, performances(*), coefficients(*, risk_factors(*))')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Technique not found' });
  res.json({ technique: data });
});

export default router;
