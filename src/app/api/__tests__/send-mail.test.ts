/**
 * @jest-environment node
 */

import { POST as sendMailHandler } from '@/app/api/send-mail/route';

describe('POST /api/send-mail', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns 401 if accessToken is missing', async () => {
    const req = new Request('http://localhost:3000/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: ['test@example.com'],
        subject: 'Hello',
        message: 'World',
      }),
    });

    const res = await sendMailHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Missing Google access token');
  });

  it('fails with friendly error message when Gmail API returns 401 expired session', async () => {
    global.fetch = jest.fn(async (url: any) => {
      if (typeof url === 'string' && url.includes('supabase')) {
        return new Response(JSON.stringify([{ id: 'mock-id' }]), { status: 200 });
      }
      if (typeof url === 'string' && url.includes('gmail.googleapis.com')) {
        return new Response(
          JSON.stringify({ error: { message: 'Invalid Credentials', code: 401 } }),
          { status: 401 }
        );
      }
      return new Response('{}', { status: 200 });
    }) as any;

    const req = new Request('http://localhost:3000/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'expired-token',
        emails: ['recipient@test.com'],
        subject: 'Test Subject',
        message: 'Test Message',
        senderEmail: 'sender@test.com',
      }),
    });

    const res = await sendMailHandler(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('sesja Google (token) wygasła');
  });

  it('fails with friendly error message when Gmail API returns 403 API disabled', async () => {
    global.fetch = jest.fn(async (url: any) => {
      if (typeof url === 'string' && url.includes('supabase')) {
        return new Response(JSON.stringify([{ id: 'mock-id' }]), { status: 200 });
      }
      if (typeof url === 'string' && url.includes('gmail.googleapis.com')) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Gmail API has not been used in project 123456 before or it is disabled.',
              code: 403,
            },
          }),
          { status: 403 }
        );
      }
      return new Response('{}', { status: 200 });
    }) as any;

    const req = new Request('http://localhost:3000/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'valid-token',
        emails: ['recipient@test.com'],
        subject: 'Test Subject',
        message: 'Test Message',
      }),
    });

    const res = await sendMailHandler(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Gmail API nie jest włączone');
  });

  it('fails with friendly error message when Gmail API returns 403 insufficient scopes', async () => {
    global.fetch = jest.fn(async (url: any) => {
      if (typeof url === 'string' && url.includes('supabase')) {
        return new Response(JSON.stringify([{ id: 'mock-id' }]), { status: 200 });
      }
      if (typeof url === 'string' && url.includes('gmail.googleapis.com')) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Request had insufficient authentication scopes.',
              code: 403,
            },
          }),
          { status: 403 }
        );
      }
      return new Response('{}', { status: 200 });
    }) as any;

    const req = new Request('http://localhost:3000/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'valid-token',
        emails: ['recipient@test.com'],
        subject: 'Test Subject',
        message: 'Test Message',
      }),
    });

    const res = await sendMailHandler(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Brak uprawnień do wysyłania (scope gmail.send)');
  });

  it('succeeds and sends emails when Gmail API returns 200 OK', async () => {
    const fetchMock = jest.fn(async (url: any) => {
      if (typeof url === 'string' && url.includes('supabase')) {
        return new Response(JSON.stringify([{ id: 'mock-campaign-id' }]), { status: 200 });
      }
      if (typeof url === 'string' && url.includes('gmail.googleapis.com')) {
        return new Response(JSON.stringify({ id: 'msg-123' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });
    global.fetch = fetchMock as any;

    const req = new Request('http://localhost:3000/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'valid-token',
        emails: ['recipient1@test.com', 'recipient2@test.com'],
        subject: 'Polish Subject: Zgoda na bity śćźż',
        message: 'Cześć,\nSprawdź ten bit!',
        senderEmail: 'producer@studio.com',
      }),
    });

    const res = await sendMailHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.campaignId).toBe('mock-campaign-id');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token',
        }),
      })
    );
  });
});
