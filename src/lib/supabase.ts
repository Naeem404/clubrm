import { createClient } from '@supabase/supabase-js'
import { logError } from "./logger"
import type { Database } from './database.types'

// 1. Get environment variables once
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// 2. Safety check
if (!supabaseUrl || !supabaseAnonKey) {
  logError('Missing Supabase environment variables', 'Supabase', 'Check your .env file')
}

// 3. Create the typed client (Main export)
// We use placeholders to prevent the app from crashing entirely if env vars are missing
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
)