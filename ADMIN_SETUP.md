# Admin Feature Setup Guide

## Required Environment Variable

The admin user creation feature requires the Supabase service role key to be added to your `.env.local` file.

### Steps to fix:

1. **Get your Service Role Key from Supabase:**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Find the "service_role" key (NOT the anon key)
   - ⚠️ **WARNING**: This key has full admin access - keep it secret!

2. **Add to your `.env.local` file:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Security Notes

- The service role key bypasses Row Level Security (RLS)
- Never commit this key to version control
- Never expose this key in client-side code
- Only use it in server actions or API routes

## Error Messages Explained

- **"Missing Supabase credentials"** - The SUPABASE_SERVICE_ROLE_KEY is not set
- **"Failed to check existing users"** - Usually means the service role key is invalid
- **"This email might already be registered"** - User already exists in auth.users
- **"Player may already exist in this pool"** - User is already a player in the selected pool

## Testing the Fix

After adding the service role key:
1. Go to `/admin` (must be logged in as isaacmray1984@gmail.com)
2. Click on "User Management" tab
3. Try creating a user with any email
4. Check the browser console for any error logs