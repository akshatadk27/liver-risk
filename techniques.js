import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/techniques - List all techniques with their performances
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('techniques')
      .select('*')
      .order('id');
    
    if (error) throw error;
    res.json({ techniques: data || [] });
  } catch (error) {
    console.error('Error fetching techniques:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/techniques/:id - Get single technique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('techniques')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Technique not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching technique:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;