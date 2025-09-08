import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkToken, setUser } from '../../../lib/simpleAuth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }
  
  try {
    // Verify token and get email
    const email = await verifyMagicLinkToken(token);
    
    if (!email) {
      return NextResponse.redirect(new URL('/login?error=invalid', request.url));
    }
    
    // Set user cookie
    await setUser(email);
    
    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }
}