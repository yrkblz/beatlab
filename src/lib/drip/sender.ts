import nodemailer from 'nodemailer';
import { DripSendError } from './errors';

export interface DripCredential {
  method: 'smtp' | 'oauth';
  senderEmail: string;
  secret: string; // App Password (smtp) or refresh token (oauth)
}

export interface DripMessage {
  to: string;
  subject: string;
  html: string;
}

function createSmtpTransport(user: string, pass: string) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 20000,
    socketTimeout: 30000,
  });
}

function classifySmtpError(err: any): DripSendError {
  const code: number | undefined = err?.responseCode;
  const text = `${err?.response || ''} ${err?.message || ''}`;
  if (err?.code === 'EAUTH' || code === 535 || code === 534) {
    return new DripSendError(
      'auth',
      'Google odrzucił logowanie (Hasło aplikacji jest nieprawidłowe lub zostało unieważnione). Zapisz nowe hasło aplikacji w zakładce Auto-Drip.'
    );
  }
  if (/5\.4\.5|daily user sending limit|sending limit exceeded|quota/i.test(text)) {
    return new DripSendError('quota', 'Google: przekroczono dzienny limit wysyłki konta Gmail. Silnik wznowi wysyłkę jutro.');
  }
  if (code === 550 || code === 553 || code === 501 || /5\.1\.[0-9]|no such user|recipient address rejected|invalid address/i.test(text)) {
    return new DripSendError('recipient', `Adres odrzucony przez serwer: ${(err?.response || err?.message || '').slice(0, 160)}`);
  }
  return new DripSendError('transient', `Chwilowy błąd SMTP: ${(err?.message || 'nieznany').slice(0, 160)}`);
}

export async function verifySmtpCredentials(user: string, pass: string): Promise<void> {
  try {
    await createSmtpTransport(user, pass).verify();
  } catch (err) {
    throw classifySmtpError(err);
  }
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new DripSendError('auth', 'Brak GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET na serwerze – użyj Hasła aplikacji Google.');
  }
  let res: Response;
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
  } catch (err: any) {
    throw new DripSendError('transient', `Błąd sieci przy odświeżaniu tokenu Google: ${err?.message || ''}`);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    if (data?.error === 'invalid_grant' || res.status === 400 || res.status === 401) {
      throw new DripSendError('auth', 'Dostęp Google wygasł lub został cofnięty. Połącz konto ponownie albo użyj Hasła aplikacji.');
    }
    throw new DripSendError('transient', `Google token error (${res.status}).`);
  }
  return data.access_token as string;
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createMime(to: string, from: string, subject: string, html: string): string {
  const headers = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  return base64Url(headers.join('\r\n') + '\r\n\r\n' + Buffer.from(html, 'utf-8').toString('base64'));
}

async function sendViaGmailApi(cred: DripCredential, msg: DripMessage): Promise<void> {
  const accessToken = await refreshGoogleAccessToken(cred.secret);
  let res: Response;
  try {
    res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: createMime(msg.to, cred.senderEmail, msg.subject, msg.html) }),
    });
  } catch (err: any) {
    throw new DripSendError('transient', `Błąd sieci Gmail API: ${err?.message || ''}`);
  }
  if (res.ok) return;
  const text = await res.text().catch(() => '');
  let detail = text;
  try {
    detail = JSON.parse(text)?.error?.message || text;
  } catch {}
  const lower = detail.toLowerCase();
  if (res.status === 401 || (res.status === 403 && /insufficient|scope|permission/.test(lower))) {
    throw new DripSendError('auth', `Gmail API odmówił dostępu: ${detail.slice(0, 160)}`);
  }
  if (res.status === 429 || /quota|rate limit|limit exceeded/.test(lower)) {
    throw new DripSendError('quota', 'Google: przekroczono dzienny limit wysyłki Gmail. Silnik wznowi wysyłkę jutro.');
  }
  if (res.status === 400 && /invalid to|recipient|address/.test(lower)) {
    throw new DripSendError('recipient', `Nieprawidłowy adres odbiorcy: ${msg.to}`);
  }
  throw new DripSendError('transient', `Gmail API (${res.status}): ${detail.slice(0, 160)}`);
}

export async function sendDripEmail(cred: DripCredential, msg: DripMessage): Promise<void> {
  if (cred.method === 'oauth') {
    return sendViaGmailApi(cred, msg);
  }
  try {
    await createSmtpTransport(cred.senderEmail, cred.secret).sendMail({
      from: cred.senderEmail,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
  } catch (err) {
    throw classifySmtpError(err);
  }
}
