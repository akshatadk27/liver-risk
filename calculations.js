import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/calculations - List all calculations
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calculations')
      .select(`
        *,
        patients:patient_id (
          id,
          age,
          gender,
          source
        ),
        techniques:technique_id (
          id,
          name,
          category
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calculations - Create single calculation
router.post('/', async (req, res) => {
  try {
    const { patient_id, technique_id, risk_result, technique_name } = req.body;
    
    // Validate required fields
    if (!technique_id || risk_result === undefined) {
      return res.status(400).json({ error: 'technique_id and risk_result are required' });
    }
    
    const { data, error } = await supabase
      .from('calculations')
      .insert([{
        patient_id: patient_id || null,
        technique_id,
        risk_result,
        technique_name: technique_name || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating calculation:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calculations/batch - Batch insert calculations
router.post('/batch', async (req, res) => {
  try {
    const { calculations } = req.body;
    
    if (!calculations || !Array.isArray(calculations)) {
      return res.status(400).json({ error: 'calculations array required' });
    }
    
    // Validate each calculation
    for (const calc of calculations) {
      if (!calc.technique_id || calc.risk_result === undefined) {
        return res.status(400).json({ error: 'Each calculation must have technique_id and risk_result' });
      }
    }
    
    const { data, error } = await supabase
      .from('calculations')
      .insert(calculations)
      .select();
    
    if (error) throw error;
    
    res.status(201).json({
      inserted: data.length,
      calculations: data
    });
  } catch (error) {
    console.error('Error batch creating calculations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calculations/patient/:patientId - Get calculations for a specific patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { data, error } = await supabase
      .from('calculations')
      .select(`
        *,
        techniques:technique_id (
          id,
          name,
          category,
          accuracy,
          precision,
          recall
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching patient calculations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calculations/technique/:techniqueId - Get calculations for a specific technique
router.get('/technique/:techniqueId', async (req, res) => {
  try {
    const { techniqueId } = req.params;
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .eq('technique_id', techniqueId)
      .order('risk_result', { ascending: false });
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching technique calculations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;