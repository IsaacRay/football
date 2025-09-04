import { createClient } from '../../utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Verify the session was created
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Auth callback: Session established:', !!session)
      
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // Create response with proper redirect
      let redirectUrl: string
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        redirectUrl = `${origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }
      
      const response = NextResponse.redirect(redirectUrl)
      
      // Set a temporary cookie to signal successful authentication
      response.cookies.set('auth-success', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 // expires in 5 seconds
      })
      
      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}