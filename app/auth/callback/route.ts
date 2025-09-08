import { createClient } from '../../utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const backdoorPlayer = searchParams.get('backdoor')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && backdoorPlayer) {
      // Set a cookie to identify which player to act as
      const cookieStore = await cookies()
      cookieStore.set('backdoor_player', backdoorPlayer, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })
    }
    
    if (!error) {
      // Use the origin for local development, production URL for production
      const redirectUrl = origin.includes('localhost') ? `${origin}/${next}` : `https://olneyacresfootball.com/${next}`
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}