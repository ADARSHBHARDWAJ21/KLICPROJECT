import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase URL and Key
const supabaseUrl = 'https://olujiwcxifvfuyuvbtkv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdWppd2N4aWZ2ZnV5dXZidGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDM3MTMsImV4cCI6MjA2NDcxOTcxM30.K9T_f4HJa0Ebi01Gzg99_ILjQKU3K1xUGF_xU2yvC1g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)