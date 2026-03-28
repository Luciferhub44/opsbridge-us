import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This function is designed to be called by a Vercel Cron Job.
// It initializes a Supabase client using environment variables
// that are NOT exposed to the browser (no VITE_ prefix).
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Ensure this is a cron job request for security
  if (req.headers['x-vercel-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ message: 'Database credentials are not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // A simple, lightweight query to generate database activity.
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      throw error;
    }

    return res.status(200).json({ message: 'Successfully pinged Supabase database.' });
  } catch (error: any) {
    return res.status(500).json({ message: `Database ping failed: ${error.message}` });
  }
}
