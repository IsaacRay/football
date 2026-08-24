import { Resend } from 'resend';

// Constructed lazily: Resend throws on an empty key, and building the app
// shouldn't require one.
let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);
  return client;
}

export function isEmailConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_RESEND_API_KEY;
}

export function getBaseUrl(): string {
  return process.env.NODE_ENV === 'production'
    ? 'https://olneyacresfootball.com'
    : process.env.NEXTAUTH_URL || 'http://localhost:3001';
}

export function magicLinkUrl(token: string): string {
  return `${getBaseUrl()}/api/auth/verify?token=${token}`;
}

const FROM = 'Football Pool <noreply@olneyacresfootball.com>';

const button = (href: string, label: string) =>
  `<a href="${href}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">${label}</a>`;

const wrap = (inner: string) =>
  `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${inner}</div>`;

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendLoginEmail(to: string, link: string): Promise<SendResult> {
  const { error } = await resend().emails.send({
    from: FROM,
    to,
    subject: 'Your login link for Football Pool',
    html: wrap(`
      <h2>Login to Football Pool</h2>
      <p>Click the link below to log in to your account:</p>
      ${button(link, 'Log In')}
      <p style="color: #666; font-size: 14px;">This link will expire in 10 minutes.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this login link, you can safely ignore this email.</p>
    `),
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendInviteEmail(
  to: string,
  link: string,
  poolName: string,
  startingLives: number
): Promise<SendResult> {
  const { error } = await resend().emails.send({
    from: FROM,
    to,
    subject: `You're in: ${poolName}`,
    html: wrap(`
      <h2>You've been added to ${poolName}</h2>
      <p>Click below to sign in - no password needed. You start with ${startingLives} lives.</p>
      ${button(link, 'Sign in and make your pick')}
      <p style="color: #666; font-size: 14px;">Each week you pick one team to win. Pick wrong and you lose a life; you can only use each team once all season.</p>
      <p style="color: #666; font-size: 14px;">This link works for 7 days. After that, sign in from the login page with this email address.</p>
    `),
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}
