// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Trage hier deine Supabase-URL und deinen Anonymen Key aus dem Supabase-Dashboard ein!
const SUPABASE_URL = 'https://xibaufkxapezpuvszpxf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYmF1Zmt4YXBlenB1dnN6cHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjEwNzUsImV4cCI6MjEwMzkzNzA3NX0.Tv3IKj95iBsGy5TGTosb7mMT-d_sySuu7QZ4RpNhB5E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);