const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Patient endpoints
export const getPatients = () => request('/api/patients');
export const getPatient = (id) => request(`/api/patients/${id}`);
export const savePatient = (data) => request('/api/patients', { method: 'POST', body: JSON.stringify(data) });
export const savePatientBatch = (data) => request('/api/patients/batch', { method: 'POST', body: JSON.stringify(data) });
export const updatePatient = (id, data) => request(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePatient = (id) => request(`/api/patients/${id}`, { method: 'DELETE' });

// Technique endpoints
export const getTechniques = () => request('/api/techniques');
export const getTechnique = (id) => request(`/api/techniques/${id}`);

// Calculation endpoints
export const getCalculations = () => request('/api/calculations');
export const saveCalculation = (data) => request('/api/calculations', { method: 'POST', body: JSON.stringify(data) });
export const saveCalculationBatch = (data) => request('/api/calculations/batch', { method: 'POST', body: JSON.stringify(data) });
export const getCalculationsByPatient = (patientId) => request(`/api/calculations/patient/${patientId}`);

// Seed endpoint
export const runSeed = () => request('/api/seed', { method: 'POST' });

// Health check
export const healthCheck = () => request('/api/health');