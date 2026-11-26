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

  it('pairs sb_secret_ SUPABASE_SERVICE_ROLE_KEY in both apikey and Authorization headers and falls back cleanly on JWT error', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test_123';
    let firstCampaignCall = true;
    global.fetch = jest.fn(async (url: any, init: any) => {
      if (typeof url === 'string' && url.includes('/rest/v1/campaigns')) {
        if (firstCampaignCall) {
          firstCampaignCall = false;
          expect(init.headers.apikey).toBe('sb_secret_test_123');
          expect(init.headers.Authorization).toBe('Bearer sb_secret_test_123');
          return new Response(JSON.stringify({ message: 'Expected 3 parts in JWT; got 1' }), { status: 401 });
        }
        expect(init.headers.apikey).toBe('fake-anon-key');
        expect(init.headers.Authorization).toBe('Bearer user.jwt.token');
        return new Response(JSON.stringify([{ id: 'camp-fallback-1' }]), { status: 201 });
      }
      if (typeof url === 'string' && url.includes('/rest/v1/email_logs')) {
        return new Response(JSON.stringify([{ id: 'log-1' }]), { status: 201 });
      }
      if (typeof url === 'string' && url.includes('gmail.googleapis.com')) {
        return new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }) as any;

    try {
      const req = new Request('http://localhost:3000/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user.jwt.token' },
        body: JSON.stringify({
          accessToken: 'valid-token',
          emails: ['Michiganmuzic1@gmail.com'],
          subject: 'Test',
          message: 'Hello',
        }),
      });
      const res = await sendMailHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.campaignId).toBe('camp-fallback-1');
    } finally {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });
});
