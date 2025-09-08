-- Magic Link Authentication Schema
-- This creates the necessary table for passwordless authentication
-- No JWT, no complex auth - just simple token-based magic links

-- Drop existing table if you need to recreate it
-- DROP TABLE IF EXISTS magic_link_tokens;

-- Create table for storing magic link tokens
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,                    -- Random token string
  email TEXT NOT NULL,                    -- User's email address
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- Token expiration time
  used BOOLEAN DEFAULT false,             -- Whether token has been used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- When token was created
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email 
  ON magic_link_tokens(email);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires_at 
  ON magic_link_tokens(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- No policies needed since this table is only accessed from server-side code
-- The table is protected by RLS being enabled with no policies

-- Optional: Add a cleanup function to remove expired tokens
-- This can be run periodically to keep the table clean
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM magic_link_tokens 
  WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up tokens daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-tokens', '0 0 * * *', 'SELECT cleanup_expired_tokens();');