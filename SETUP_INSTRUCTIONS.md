# NFL Survivor Pool Setup Instructions

## 🏈 Magic Link Authentication with Supabase

I've set up magic link authentication for your survivor pool! Here's how to complete the setup:

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up/sign in with GitHub
4. Click "New Project"
5. Choose your organization
6. Fill in project details:
   - **Name**: `nfl-survivor-pool`
   - **Database Password**: (generate a secure password)
   - **Region**: Choose closest to you
7. Click "Create new project"

## 2. Get Your Project Keys

Once your project is created:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 3. Update Environment Variables

Edit the `.env.local` file and replace the placeholder values:

```bash
# Replace with your actual values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Run these SQL files in order:
   
   **First:** Copy and paste `supabase_schema.sql` 
   - This creates all tables, RLS policies, and functions
   
   **Second:** Copy and paste `supabase_auth_schema.sql`
   - This adds authentication and profiles
   
   **Third:** Copy and paste `nfl_2025_complete_schedule.sql`
   - This adds the full NFL schedule

## 5. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, add: `http://localhost:3000`
3. Under **Redirect URLs**, add: `http://localhost:3000/auth/callback`
4. **Enable Email Auth** (should be on by default)
5. Configure email templates if desired

## 6. Test the Application

1. Start your dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should see the login page
4. Enter your email and click "Send Magic Link"
5. Check your email for the magic link
6. Click the link to sign in

## 🎯 What You Get

- **Magic Link Authentication**: No passwords needed!
- **Auto-join**: New users automatically join the default pool
- **Profile Management**: User profiles created automatically  
- **Secure**: Row Level Security policies protect user data
- **3-Life System**: Full survivor pool functionality

## 🔧 Features Included

- **Email-only sign in** with magic links
- **Automatic profile creation** 
- **Auto-join default pool** for new users
- **User navigation** with sign out
- **Loading states** and error handling
- **Responsive design** for mobile/desktop

## 📁 Files Created

- `app/lib/supabase.ts` - Supabase client configuration
- `app/contexts/AuthContext.tsx` - Authentication context
- `app/components/Auth.tsx` - Login component
- `app/components/Navigation.tsx` - User navigation
- `app/auth/callback/route.ts` - Auth callback handler
- `supabase_auth_schema.sql` - Additional auth tables
- `.env.local` - Environment variables

## 🚀 Production Deployment

For production (Vercel/Netlify):
1. Add your environment variables to your hosting platform
2. Update Site URL and Redirect URLs in Supabase to your production domain
3. Deploy!

Your magic link authentication is ready to go! 🎉