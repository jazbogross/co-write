// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://rvcjjrthsktrkrdcujna.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2pqcnRoc2t0cmtyZGN1am5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MDQzMDMsImV4cCI6MjA1NDA4MDMwM30.7OTYyRzXfkIbHHoAOPS1RwaYlQ8rc5JUUfCRMVVRfN4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);