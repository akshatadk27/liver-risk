// src/routes/patients.js
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── Schema ──────────────────────────────────────────────────────────────────
const PatientSchema = z.object({
  age:        z.number().int().min(1).max(120),
  gender:     z.enum(['Male', 'Female', 'Other']),
  bilirubin:  z.number().min(0).max(100).optional().nullable(),
  alt:        z.number().min(0).max(10000).optional().nullable(),
  ast:        z.number().min(0).max(10000).optional().nullable(),
  platelets:  z.number().min(0).max(2000).optional().nullable(),
  alcohol:    z.string().optional().nullable(),
  smoking:    z.string().optional().nullable(),
  bmi:        z.number().min(10).max(80).optional().nullable(),
  hbv:        z.boolean().optional().nullable(),
  hcv:        z.boolean().optional().nullable(),
  diabetes:   z.string().optional().nullable(),
  source:     z.enum(['ocr', 'manual', 'camera']).default('manual'),
  // Family history of liver disease — string value matching UI options
  // Source: Donato et al. Hepatology 1997 (OR ≈3.0 first-degree); Loomba et al. 2015 (OR ≈1.8 second-degree)
  family_history_liver: z.string().optional().nullable(),
});

const CalcSchema = z.object({
  patient_id:   z.number().int().positive(),
  technique_id: z.number().int().positive(),
  risk_result:  z.number().min(0).max(100),
});

const BatchSchema = z.object({
  patient_count:      z.number().int().positive(),
  average_risk:       z.number().min(0).max(100),
  techniques_summary: z.any() // JSON array of performance metrics
});

// ── POST /api/patients ───────────────────────────────────────────────────────
router.post('/', validate(PatientSchema), async (req, res) => {
  const { data, error } = await supabase
    .from('patients')
    .insert([req.body])
    .select()
    .single();

  if (error) {
    console.error('Insert patient error:', error);
    return res.status(500).json({ error: 'Failed to save patient' });
  }
  res.status(201).json({ patient: data });
});

// ── GET /api/patients ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  ?? '50', 10), 200);
  const offset = Math.max(parseInt(req.query.offset ?? '0',  10), 0);

  const { data, error, count } = await supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: 'Failed to fetch patients' });
  res.json({ patients: data, total: count, limit, offset });
});

// ── GET /api/patients/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*, calculations(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient: data });
});

// ── POST /api/patients/calculations ─────────────────────────────────────────
router.post('/calculations', validate(CalcSchema), async (req, res) => {
  const { data, error } = await supabase
    .from('calculations')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to save calculation' });
  res.status(201).json({ calculation: data });
});

// ── POST /api/patients/batches ──────────────────────────────────────────────
router.post('/batches', validate(BatchSchema), async (req, res) => {
  const { patient_count, average_risk, techniques_summary } = req.body;

  // Insert into static_batches
  const { data: batchData, error: batchError } = await supabase
    .from('static_batches')
    .insert([{ patient_count, average_risk }])
    .select()
    .single();

  if (batchError) {
    console.error('Insert batch error:', batchError);
    return res.status(500).json({ error: 'Failed to save batch summary' });
  }

  // Insert into static_batch_techniques
  const techniquesData = techniques_summary.map(t => ({
    batch_id:       batchData.id,
    technique_name: t.name,
    average_risk:   t.avgRisk,
    accuracy:       t.accuracy,
    precision:      t.precision,
    recall:         t.recall,
    f1_score:       t.f1_score
  }));

  const { error: techError } = await supabase
    .from('static_batch_techniques')
    .insert(techniquesData);

  if (techError) {
    console.error('Insert batch techniques error:', techError);
    return res.status(500).json({ error: 'Failed to save batch techniques' });
  }

  res.status(201).json({ batch: batchData });
});

export default router;
