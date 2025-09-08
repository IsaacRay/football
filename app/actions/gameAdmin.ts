'use server';

import { createClient } from '../utils/supabase/server';

const ADMIN_EMAIL = 'isaacmray1984@gmail.com';

export async function updateGameWinnerAdmin(gameId: string, winnerId: string | null) {
  const supabase = await createClient();
  
  // Verify the user is admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  try {
    // Use the Supabase client with admin privileges by using .rpc to bypass RLS
    // Or we can try to update with the authenticated user context
    const { data, error } = await supabase
      .from('games')
      .update({ 
        winner: winnerId,
        is_complete: winnerId !== null,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)
      .select();
    
    if (error) {
      console.error('Error updating game winner:', error);
      
      // If RLS is blocking, we need to use a different approach
      // Try using raw SQL through RPC function
      if (error.code === '42501') { // Permission denied error
        return { 
          success: false, 
          message: 'Permission denied. Please run the following SQL in your Supabase dashboard:\n\n' +
                   'CREATE POLICY "Admin can update games" ON games\n' +
                   'FOR UPDATE USING (auth.jwt() ->> \'email\' = \'isaacmray1984@gmail.com\')\n' +
                   'WITH CHECK (auth.jwt() ->> \'email\' = \'isaacmray1984@gmail.com\');',
          requiresPolicy: true
        };
      }
      
      return { success: false, message: error.message };
    }
    
    console.log('Game updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}