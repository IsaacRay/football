-- Disable RLS for magic_link_tokens table since it needs to work for unauthenticated users
ALTER TABLE magic_link_tokens DISABLE ROW LEVEL SECURITY;

-- Or alternatively, if you prefer to keep RLS enabled, create policies that allow anyone to insert/read
-- ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public token creation" ON magic_link_tokens FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public token reading" ON magic_link_tokens FOR SELECT USING (true);
-- CREATE POLICY "Allow public token updates" ON magic_link_tokens FOR UPDATE USING (true);