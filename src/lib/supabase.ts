import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://glyguhuvvhvkgfupsypl.supabase.co';
const supabaseAnonKey = 'sb_publishable_CYaCMf_4NUmQAFAGtifmAw_vUs0Wklj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
