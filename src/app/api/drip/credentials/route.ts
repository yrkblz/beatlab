import { NextResponse } from 'next/server';
import { getAdminClient, getUserFromRequest } from '@/lib/drip/admin';
import { encryptSecret } from '@/lib/drip/crypto';
import { verifySmtpCredentials, refreshGoogleAccessToken } from '@/lib/drip/sender';
import { isValidEmail, normalizeEmail } from '@/lib/drip/email-parser';
import { DripSendError } from '@/lib/drip/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function auth(request: Request) {
  const admin = getAdminClient();
  const user = await getUserFromRequest(request, admin);
  return { admin, user };
}

export async function GET(request: Request) {
  try {
    const { admin, user } = await auth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data } = await admin
      .from('drip_credentials')
      .select('method, sender_email, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    return NextResponse.json({
      configured: Boolean(data),
      method: data?.method,
      senderEmail: data?.sender_email,
      updatedAt: data?.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`drip_credentials_${getClientIp(request)}`, 10, 10 * 60000);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Zbyt wiele prób. Odczekaj kilka minut.' }, { status: 429 });
  }
  try {
    const { admin, user } = await auth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const method = body?.method === 'oauth' ? 'oauth' : 'smtp';
    const senderEmail = normalizeEmail(String(body?.senderEmail || ''));
    if (!isValidEmail(senderEmail)) {
      return NextResponse.json({ error: 'Podaj poprawny adres Gmail nadawcy.' }, { status: 400 });
    }

    let secret = '';
    if (method === 'smtp') {
      secret = String(body?.appPassword || '').replace(/\s+/g, '');
      if (secret.length < 12 || secret.length > 64) {
        return NextResponse.json(
          { error: 'Hasło aplikacji Google ma 16 znaków (np. "abcd efgh ijkl mnop"). Wygeneruj je na myaccount.google.com/apppasswords.' },
          { status: 400 }
        );
      }
      try {
        await verifySmtpCredentials(senderEmail, secret);
      } catch (err: any) {
        const msg = err instanceof DripSendError && err.kind === 'auth'
          ? 'Google odrzucił to Hasło aplikacji. Upewnij się, że masz włączoną weryfikację dwuetapową i skopiowałeś nowe 16-znakowe hasło aplikacji dla tego samego konta Gmail.'
          : err?.message || 'Nie udało się połączyć z serwerem Gmail.';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else {
      secret = String(body?.refreshToken || '').trim();
      if (!secret) {
        return NextResponse.json(
          { error: 'Brak refresh tokenu Google. Połącz ponownie konto Google lub użyj Hasła aplikacji.' },
          { status: 400 }
        );
      }
      try {
        await refreshGoogleAccessToken(secret);
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Nieprawidłowy token Google.' }, { status: 400 });
      }
    }

    const { error } = await admin.from('drip_credentials').upsert(
      {
        user_id: user.id,
        method,
        sender_email: senderEmail,
        secret_encrypted: encryptSecret(secret),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ configured: true, method, senderEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin, user } = await auth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await admin.from('drip_credentials').delete().eq('user_id', user.id);
    return NextResponse.json({ configured: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}
