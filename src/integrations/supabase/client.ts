
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://uoasmfawwtkejjdglyws.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYXNtZmF3d3RrZWpqZGdseXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NjQwMjYsImV4cCI6MjA1NzQ0MDAyNn0.mXTNpHE-z0mV3YU0b9MeFi6YUT3iBikoYh_3m1p1fVw";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
      detectSessionInUrl: true
    }
  }
);
