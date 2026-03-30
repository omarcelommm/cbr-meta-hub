import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hnhmwqiwtwzmhvqyzxmh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaG13cWl3dHd6bWh2cXl6eG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTUzMDksImV4cCI6MjA4ODYzMTMwOX0.FPkO8u9YfRpPCVNDAucWps7LsPDHRBFf9CqRb8995lk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
