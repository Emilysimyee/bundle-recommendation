// Supabase Configuration
const SUPABASE_URL = 'https://wyyrfhaqguxyfidlesyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5eXJmaGFxZ3V4eWZpZGxlc3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTAyMTEsImV4cCI6MjA3NzcyNjIxMX0.J_V7zEs4QZrNJlLk47-Gznw9gFwA50PENKY-HRUeWsY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabase;