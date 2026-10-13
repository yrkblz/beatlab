import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

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
    const body = await request.json();
    
    // Support batch requests
    if (body.emails && Array.isArray(body.emails)) {
      const results = await Promise.all(body.emails.map((email: string) => checkEmail(email)));
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
