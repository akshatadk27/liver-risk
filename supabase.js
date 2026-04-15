// backend/src/lib/supabase.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env\n' +
    'Make sure you are using the SERVICE ROLE key (not the anon key).\n' +
    'Find it at: Supabase Dashboard → Project Settings → API → service_role'
  );
}

// Validate that it looks like a service role key (role claim = "service_role")
try {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
  if (payload.role !== 'service_role') {
    console.warn(
      '⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY appears to be the ANON key (role="' +
      payload.role + '"). RLS will block inserts. ' +
      'Please use the service_role key from Supabase → Settings → API.'
    );
  }
} catch (_) { /* ignore parse errors */ }

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});


























