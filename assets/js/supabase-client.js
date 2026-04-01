import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV || {};

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.dispatchEvent(new Event('supabase-ready'));
