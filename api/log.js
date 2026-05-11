import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, platform, title, action, quality } = req.body;

    if (!url || !platform) {
      return res.status(400).json({ error: 'Missing url or platform' });
    }

    // Hash IP (never store raw IP)
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    const { data, error } = await supabase.from('downloads').insert([
      {
        url,
        platform,
        title: title || null,
        action: action || 'fetch',
        quality: quality || null,
        ip_hash: ipHash,
      },
    ]);

    if (error) {
      console.error('[LOG ERROR]', error);
      return res.status(500).json({ error: 'Failed to log event' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[LOG EXCEPTION]', err);
    res.status(500).json({ error: err.message });
  }
}
