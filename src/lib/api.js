// src/lib/api.js
// Thin wrapper around the backend REST API

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

// ── Patients ──────────────────────────────────────────────────────────────────
export const savePatient = (data)  => request('/api/patients', { method: 'POST', body: JSON.stringify(data) });
export const getPatients = (params) => request(`/api/patients?${new URLSearchParams(params)}`);
export const getPatient  = (id)    => request(`/api/patients/${id}`);

// ── Calculations ─────────────────────────────────────────────────────────────
export const saveCalculation = (data) =>
  request('/api/patients/calculations', { method: 'POST', body: JSON.stringify(data) });

// ── Batches ───────────────────────────────────────────────────────────────────
export const saveStaticBatch = (data) =>
  request('/api/patients/batches', { method: 'POST', body: JSON.stringify(data) });

// ── Techniques ────────────────────────────────────────────────────────────────
export const getTechniques = ()   => request('/api/techniques');
export const getTechnique  = (id) => request(`/api/techniques/${id}`);
