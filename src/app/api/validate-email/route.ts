import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

const resolveMx = promisify(dns.resolveMx);

async function checkEmail(email: string) {
  if (!email || !email.includes('@')) {
    return { email, valid: false, reason: 'Invalid format' };
  }

  const domain = email.split('@')[1];

  try {
    const records = await resolveMx(domain);
    if (records && records.length > 0) {
      return { email, valid: true };
    } else {
      return { email, valid: false, reason: 'No mail servers' };
    }
  } catch (dnsError: any) {
    if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
      return { email, valid: false, reason: 'Domain not found' };
    }
    // If there's another DNS error, assume valid to avoid false positives
    return { email, valid: true };
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    // Limit to 40 requests per minute per IP
    const rate = checkRateLimit(`val_email_${clientIp}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many email verification requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rate.resetSeconds) } }
      );
    }

    const body = await request.json();
    
    // Support batch requests, bounded to max 100 to prevent DNS resource exhaustion
    if (body.emails && Array.isArray(body.emails)) {
      const boundedEmails = body.emails.slice(0, 100);
      const results = await Promise.all(boundedEmails.map((email: string) => checkEmail(email)));
      return NextResponse.json({ results });
    }

    // Fallback for single email support
    const result = await checkEmail(body.email);
    if (!result.valid) {
      return NextResponse.json({ valid: false, reason: result.reason });
    }
    return NextResponse.json({ valid: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
