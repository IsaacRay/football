import { NextRequest, NextResponse } from 'next/server';
import { createMagicLinkToken } from '../../../lib/simpleAuth';
import { isEmailConfigured, magicLinkUrl, sendLoginEmail } from '../../../lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const token = await createMagicLinkToken(normalizedEmail);
    const magicLink = magicLinkUrl(token);

    // Without a Resend key, log the link instead of mailing it - useful locally.
    if (!isEmailConfigured()) {
      console.log('Magic link for', normalizedEmail, ':', magicLink);
      return NextResponse.json({
        success: true,
        message: 'Check console for magic link (dev mode)',
      });
    }

    const result = await sendLoginEmail(normalizedEmail, magicLink);
    if (!result.ok) {
      console.error('Email error:', result.error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
