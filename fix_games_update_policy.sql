-- Add UPDATE policy for games table to allow admin to update game results
-- Admin is identified by email 'isaacmray1984@gmail.com'

-- Create a policy that allows the admin user to update games
CREATE POLICY "Admin can update games" ON games
  FOR UPDATE 
  USING (auth.jwt() ->> 'email' = 'isaacmray1984@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'isaacmray1984@gmail.com');

-- Also create INSERT and DELETE policies for admin (for future use)
CREATE POLICY "Admin can insert games" ON games
  FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'email' = 'isaacmray1984@gmail.com');

CREATE POLICY "Admin can delete games" ON games
  FOR DELETE
  USING (auth.jwt() ->> 'email' = 'isaacmray1984@gmail.com');