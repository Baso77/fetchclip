-- ================================================
-- FetchClip — Supabase SQL Schema
-- Paste this into Supabase SQL Editor
-- ================================================

-- Downloads / Analytics table
CREATE TABLE IF NOT EXISTS downloads (
  id bigserial PRIMARY KEY,
  url text,
  platform text,
  title text,
  action text DEFAULT 'fetch',        -- 'fetch' | 'download'
  quality text,
  ip_hash text,                        -- hashed, never raw IP
  created_at timestamptz DEFAULT now()
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Media cache (optional — speeds up repeated requests)
CREATE TABLE IF NOT EXISTS media_cache (
  id bigserial PRIMARY KEY,
  url_hash text UNIQUE NOT NULL,
  url text NOT NULL,
  platform text,
  title text,
  thumbnail text,
  duration integer,
  metadata jsonb,
  expires_at timestamptz DEFAULT (now() + interval '2 hours'),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_downloads_platform ON downloads(platform);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_cache_url_hash ON media_cache(url_hash);
CREATE INDEX IF NOT EXISTS idx_media_cache_expires_at ON media_cache(expires_at);

-- Row Level Security (RLS)
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service role key)
CREATE POLICY "Service role access" ON downloads
  FOR ALL USING (true);

CREATE POLICY "Service role access" ON contact_messages
  FOR ALL USING (true);

CREATE POLICY "Service role access" ON media_cache
  FOR ALL USING (true);

-- Analytics view (useful for dashboard)
CREATE OR REPLACE VIEW download_stats AS
SELECT
  platform,
  action,
  DATE(created_at) AS date,
  COUNT(*) AS count
FROM downloads
GROUP BY platform, action, DATE(created_at)
ORDER BY date DESC;

-- Popular platforms view
CREATE OR REPLACE VIEW platform_popularity AS
SELECT
  platform,
  COUNT(*) AS total_fetches,
  COUNT(CASE WHEN action = 'download' THEN 1 END) AS total_downloads
FROM downloads
GROUP BY platform
ORDER BY total_fetches DESC;
