import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/patients - List all patients
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ patients: data || [], total: data?.length || 0 });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients/:id - Get single patient
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Patient not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients - Create single patient
router.post('/', async (req, res) => {
  try {
    // Normalize the data
    const patientData = {
      ...req.body,
      hbv: req.body.hbv === 'Yes' || req.body.hbv === true,
      hcv: req.body.hcv === 'Yes' || req.body.hcv === true,
      age: req.body.age ? Number(req.body.age) : null,
      bilirubin: req.body.bilirubin ? Number(req.body.bilirubin) : null,
      alt: req.body.alt ? Number(req.body.alt) : null,
      ast: req.body.ast ? Number(req.body.ast) : null,
      platelets: req.body.platelets ? Number(req.body.platelets) : null,
      bmi: req.body.bmi ? Number(req.body.bmi) : null,
    };
    
    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients/batch - Batch insert patients
router.post('/batch', async (req, res) => {
  try {
    const { patients } = req.body;
    
    if (!patients || !Array.isArray(patients)) {
      return res.status(400).json({ error: 'patients array required' });
    }
    
    // Normalize each patient
    const normalizedPatients = patients.map(patient => ({
      ...patient,
      hbv: patient.hbv === 'Yes' || patient.hbv === true,
      hcv: patient.hcv === 'Yes' || patient.hcv === true,
      age: patient.age ? Number(patient.age) : null,
      bilirubin: patient.bilirubin ? Number(patient.bilirubin) : null,
      alt: patient.alt ? Number(patient.alt) : null,
      ast: patient.ast ? Number(patient.ast) : null,
      platelets: patient.platelets ? Number(patient.platelets) : null,
      bmi: patient.bmi ? Number(patient.bmi) : null,
    }));
    
    const { data, error } = await supabase
      .from('patients')
      .insert(normalizedPatients)
      .select();
    
    if (error) throw error;
    
    res.status(201).json({
      inserted: data.length,
      patients: data
    });
  } catch (error) {
    console.error('Error batch creating patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('patients')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Patient not found' });
    res.json(data);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;




