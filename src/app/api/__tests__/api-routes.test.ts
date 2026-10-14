/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// ----------------------------------------------------
// 1. DNS Mocking for /api/validate-email
// ----------------------------------------------------
const mockResolveMx = jest.fn();
jest.mock('dns', () => ({
  resolveMx: (domain: string, callback: (err: any, addresses?: any[]) => void) => {
    mockResolveMx(domain, callback);
  },
}));

// ----------------------------------------------------
// 2. Stripe Mocking for /api/checkout & /api/webhook/stripe
// ----------------------------------------------------
const mockCheckoutSessionsCreate = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: any[]) => mockCheckoutSessionsCreate(...args),
      },
    },
    webhooks: {
      constructEvent: (...args: any[]) => mockConstructEvent(...args),
    },
  },
  LIFETIME_PRICE_CENTS: 2900,
  STRIPE_LIFETIME_PRODUCT_ID: 'prod_test',
}));

// ----------------------------------------------------
// 3. Supabase Mocking
// ----------------------------------------------------
const mockSupabaseUpdate = jest.fn(() => ({
  eq: jest.fn().mockResolvedValue({ error: null }),
}));
const mockStorageRemove = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        remove: mockStorageRemove,
      })),
    },
    from: jest.fn(() => ({
      update: mockSupabaseUpdate,
    })),
  })),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: mockSupabaseUpdate,
    })),
  },
}));

// Imports of API route handlers
import { POST as validateEmailHandler } from '../validate-email/route';
import { POST as leadsHandler } from '../leads/route';
import { POST as publishHandler } from '../publish/route';
import { GET as trackHandler } from '../track/route';
import { POST as checkoutHandler } from '../checkout/route';
import { POST as webhookHandler } from '../webhook/stripe/route';

describe('Backend API Route Handlers', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    originalFetch = global.fetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  // =========================================================================
  // /api/validate-email
  // =========================================================================
  describe('POST /api/validate-email', () => {
    it('returns invalid for emails missing @ sign', async () => {
      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'notanemail' }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('Invalid format');
    });

    it('returns valid: true when domain has active MX records', async () => {
      mockResolveMx.mockImplementation((domain, cb) => {
        cb(null, [{ exchange: 'mail.google.com', priority: 10 }]);
      });

      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'producer@gmail.com' }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.valid).toBe(true);
    });

    it('returns invalid with "No mail servers" when MX records list is empty', async () => {
      mockResolveMx.mockImplementation((domain, cb) => {
        cb(null, []);
      });

      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@nomaildomain.com' }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('No mail servers');
    });

    it('returns invalid with "Domain not found" when DNS returns ENOTFOUND', async () => {
      mockResolveMx.mockImplementation((domain, cb) => {
        const err = new Error('not found');
        (err as any).code = 'ENOTFOUND';
        cb(err);
      });

      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost@totallyfakehost999.xyz' }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('Domain not found');
    });

    it('returns invalid with "Domain not found" when DNS returns ENODATA', async () => {
      mockResolveMx.mockImplementation((domain, cb) => {
        const err = new Error('no data');
        (err as any).code = 'ENODATA';
        cb(err);
      });

      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@nodatahost.org' }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('Domain not found');
    });

    it('supports batch validation of an array of emails', async () => {
      mockResolveMx.mockImplementation((domain, cb) => {
        if (domain === 'valid.com') {
          cb(null, [{ exchange: 'mx.valid.com', priority: 10 }]);
        } else {
          const err = new Error();
          (err as any).code = 'ENOTFOUND';
          cb(err);
        }
      });

      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: ['good@valid.com', 'bad@fake.com'],
        }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.results).toBeDefined();
      expect(json.results).toHaveLength(2);
      expect(json.results[0]).toEqual({ email: 'good@valid.com', valid: true });
      expect(json.results[1]).toEqual({ email: 'bad@fake.com', valid: false, reason: 'Domain not found' });
    });
  });

  // =========================================================================
  // /api/leads
  // =========================================================================
  describe('POST /api/leads', () => {
    it('returns 500 when YOUTUBE_API_KEY is not configured', async () => {
      delete process.env.YOUTUBE_API_KEY;

      const req = new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'trap beat' }),
      });

      const res = await leadsHandler(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toMatch(/Missing YOUTUBE_API_KEY/i);
    });

    it('returns 400 when query is missing', async () => {
      process.env.YOUTUBE_API_KEY = 'test_yt_key';

      const req = new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      });

      const res = await leadsHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Missing query/i);
    });

    it('extracts Instagram handles accurately from video descriptions', async () => {
      process.env.YOUTUBE_API_KEY = 'test_yt_key';

      // Mock search response
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [{ id: { videoId: 'v123' } }, { id: { videoId: 'v456' } }],
            }),
          });
        }
        if (url.includes('/videos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [
                {
                  id: 'v123',
                  snippet: {
                    channelTitle: '808 Producer',
                    title: 'Travis Scott Type Beat',
                    description: 'DM for stems: instagram.com/808travis',
                  },
                },
                {
                  id: 'v456',
                  snippet: {
                    channelTitle: 'Melody Maker',
                    title: 'Gunna Guitar Beat',
                    description: 'Hit me on IG: @gunnamelodies for lease inquiry',
                  },
                },
              ],
            }),
          });
        }
        return Promise.reject(new Error('Unknown url'));
      }) as any;

      const req = new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'gunna type beat' }),
      });

      const res = await leadsHandler(req);
      const json = await res.json();

      expect(json.leads).toBeDefined();
      expect(json.leads).toHaveLength(2);
      expect(json.leads[0].instagram).toBe('808travis');
      expect(json.leads[1].instagram).toBe('gunnamelodies');
    });

    it('returns empty array when search returns no videos', async () => {
      process.env.YOUTUBE_API_KEY = 'test_yt_key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const req = new Request('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'ultra rare nonexistent search' }),
      });

      const res = await leadsHandler(req);
      const json = await res.json();

      expect(json.leads).toEqual([]);
    });
  });

  // =========================================================================
  // /api/track
  // =========================================================================
  describe('GET /api/track', () => {
    it('returns a 1x1 transparent GIF with correct no-cache headers', async () => {
      const req = new Request('http://localhost:3000/api/track');
      const res = await trackHandler(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/gif');
      expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    });

    it('updates email log opened status in Supabase when log_id is present', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const req = new Request('http://localhost:3000/api/track?log_id=log-abc-123');
      const res = await trackHandler(req);

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('email_logs?id=eq.log-abc-123'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  // =========================================================================
  // /api/checkout
  // =========================================================================
  describe('POST /api/checkout', () => {
    it('creates a Stripe checkout session with $29 USD and metadata', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test_session',
      });

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'origin': 'https://beatlab.space',
        },
        body: JSON.stringify({
          userId: 'usr-buyer-1',
          userEmail: 'producer@beatlab.space',
        }),
      });

      const res = await checkoutHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.url).toBe('https://checkout.stripe.com/pay/cs_test_session');
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer_email: 'producer@beatlab.space',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'usd',
                unit_amount: 2900,
              }),
            }),
          ],
          metadata: expect.objectContaining({
            userId: 'usr-buyer-1',
            userEmail: 'producer@beatlab.space',
            plan: 'lifetime',
          }),
        })
      );
    });
  });

  // =========================================================================
  // /api/webhook/stripe
  // =========================================================================
  describe('POST /api/webhook/stripe', () => {
    it('updates profile to is_lifetime_paid: true on checkout.session.completed', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_456',
            metadata: {
              userId: 'usr-paid-user',
            },
          },
        },
      });

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const req = new Request('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'sig_test',
        },
        body: JSON.stringify({}),
      });

      const res = await webhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_lifetime_paid: true,
          stripe_customer_id: 'cus_test_456',
          stripe_session_id: 'cs_test_123',
        })
      );
    });

    it('returns 400 when webhook signature verification fails', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const req = new Request('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_sig',
        },
        body: 'raw body text',
      });

      const res = await webhookHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Webhook Error: Invalid signature/i);
    });

    it('returns received: true for unhandled webhook event types without modifying database', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      });

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const req = new Request('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify({}),
      });

      const res = await webhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });

    it('ignores session completed event when userId metadata is missing', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_no_user',
            customer: 'cus_123',
            metadata: {},
          },
        },
      });

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      const req = new Request('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify({}),
      });

      const res = await webhookHandler(req);
      expect(res.status).toBe(200);
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });

    it('parses raw body as JSON when webhook secret or signature is absent in dev/testing', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const payload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_dev_123',
            customer: 'cus_dev_456',
            metadata: { userId: 'usr-dev-test' },
          },
        },
      };

      const req = new Request('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await webhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_lifetime_paid: true,
          stripe_session_id: 'cs_dev_123',
        })
      );
    });
  });

  // =========================================================================
  // /api/publish
  // =========================================================================
  describe('POST /api/publish', () => {
    let origSetTimeout: typeof setTimeout;

    beforeEach(() => {
      origSetTimeout = global.setTimeout;
      // Instant setTimeout to avoid real 3s delay in tests
      global.setTimeout = ((fn: any) => {
        fn();
        return 0 as any;
      }) as any;
    });

    afterEach(() => {
      global.setTimeout = origSetTimeout;
    });

    it('returns 400 when body is not valid JSON', async () => {
      const req = new Request('http://localhost:3000/api/publish', {
        method: 'POST',
        body: 'invalid-non-json-body',
      });

      const res = await publishHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid JSON body');
    });

    it('returns 400 when filePath is missing or empty', async () => {
      const req = new Request('http://localhost:3000/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: '' }),
      });

      const res = await publishHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid filePath');
    });

    it('returns 400 when filePath contains illegal directory traversal characters', async () => {
      const slashReq = new Request('http://localhost:3000/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'subdir/video.mp4' }),
      });
      const slashRes = await publishHandler(slashReq);
      expect(slashRes.status).toBe(400);

      const backslashReq = new Request('http://localhost:3000/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'subdir\\video.mp4' }),
      });
      const backslashRes = await publishHandler(backslashReq);
      expect(backslashRes.status).toBe(400);
    });

    it('successfully cleans up uploaded video from temp_social_videos bucket', async () => {
      const req = new Request('http://localhost:3000/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: '1791234567.mp4',
          videoUrl: 'https://supabase.test.co/storage/v1/object/public/temp_social_videos/1791234567.mp4',
          text: 'New Beat Out Now! 🔥 #trap',
          platforms: ['tiktok', 'instagram'],
        }),
      });

      const res = await publishHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockStorageRemove).toHaveBeenCalledWith(['1791234567.mp4']);
    });
  });

  // =========================================================================
  // Additional /api/validate-email edge cases
  // =========================================================================
  describe('POST /api/validate-email additional edge cases', () => {
    it('assumes valid when DNS throws non-ENOTFOUND error (fallback protection)', async () => {
      mockResolveMx.mockImplementation((domain, cb) => {
        const err = new Error('SERVFAIL temporary DNS glitch');
        (err as any).code = 'ESERVFAIL';
        cb(err);
      });

      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@temporarydnsproblem.com' }),
      });

      const res = await validateEmailHandler(req);
      const json = await res.json();

      expect(json.valid).toBe(true);
    });

    it('handles empty body gracefully returning 500 error', async () => {
      const req = new Request('http://localhost:3000/api/validate-email', {
        method: 'POST',
        body: 'invalid json',
      });

      const res = await validateEmailHandler(req);
      expect(res.status).toBe(500);
    });
  });
});
