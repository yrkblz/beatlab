import { InstagramSessionClient } from '../instagram-session-client';
import {
  getScrapeState,
  saveScrapeState,
  getKnownScannedUsernames,
  recordScannedProfiles,
} from '../instagram-scraper-cache';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('InstagramSessionClient & Scraper Cache', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('InstagramSessionClient sends appropriate headers and parses profile correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: '39851405940',
            username: 'ontheradarradio',
            full_name: 'On The Radar',
            biography: 'Host of the best underground shows. Contact: booking@ontheradar.com',
            external_url: 'https://open.spotify.com/playlist/ontheradar',
            bio_links: [
              { url: 'https://open.spotify.com/playlist/ontheradar' },
              { url: 'https://linktr.ee/ontheradar' }
            ],
            edge_followed_by: { count: 2330000 },
            edge_follow: { count: 5890 },
            is_private: false,
            is_verified: true,
            business_email: 'booking@ontheradar.com',
          },
        },
      }),
    });

    const client = new InstagramSessionClient({ sessionId: 'mock-session-123' });
    const profile = await client.fetchUserProfile('ontheradarradio');

    expect(profile).toBeDefined();
    expect(profile?.username).toBe('ontheradarradio');
    expect(profile?.email).toBe('booking@ontheradar.com');
    expect(profile?.bioLinks).toContain('https://open.spotify.com/playlist/ontheradar');
    expect(profile?.bioLinks).toContain('https://linktr.ee/ontheradar');
    expect(profile?.followerCount).toBe(2330000);
    expect(profile?.isPrivate).toBe(false);

    // Verify headers passed to fetch
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = fetchArgs[1].headers;
    expect(headers['x-ig-app-id']).toBe('936619743392459');
    expect(headers['Cookie']).toContain('sessionid=mock-session-123');
  });

  test('InstagramSessionClient fetches following batch and parses next cursor', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        users: [
          {
            pk: '1001',
            username: 'rapper_a',
            full_name: 'Rapper A',
            is_private: false,
            is_verified: true,
          },
          {
            pk: '1002',
            username: 'producer_b',
            full_name: 'Producer B',
            is_private: true,
            is_verified: false,
          },
        ],
        next_max_id: 'CURSOR_PAGE_2',
        big_list: true,
      }),
    });

    const client = new InstagramSessionClient({ sessionId: 'mock-session-123' });
    const batch = await client.fetchFollowingBatch('39851405940', 50);

    expect(batch.users.length).toBe(2);
    expect(batch.users[0].username).toBe('rapper_a');
    expect(batch.users[1].isPrivate).toBe(true);
    expect(batch.nextCursor).toBe('CURSOR_PAGE_2');
    expect(batch.hasMore).toBe(true);
  });

  test('InstagramSessionClient resolves numeric user ID via public embed', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(`
        <div data-media-type="Profile" data-owner-id="39851405940"></div>
      `),
    });

    const client = new InstagramSessionClient({ sessionId: 'mock-session-123' });
    const userId = await client.resolveUserId('ontheradarradio');

    expect(userId).toBe('39851405940');
  });

  test('InstagramSessionClient marks followers hasMore as false when should_limit_list_of_followers is true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        users: [{ pk: '5001', username: 'follower_1' }],
        big_list: false,
        has_more: false,
        should_limit_list_of_followers: true,
      }),
    });

    const client = new InstagramSessionClient({ sessionId: 'mock-session-123' });
    const batch = await client.fetchFollowersBatch('39851405940', 50);

    expect(batch.users.length).toBe(1);
    expect(batch.hasMore).toBe(false);
    expect(batch.nextCursor).toBeUndefined();
  });

  test('Cache records scanned profiles and retrieves state properly', async () => {
    await saveScrapeState('ontheradarradio', 'following', 'CURSOR_PAGE_2', 50, 12);
    const state = await getScrapeState('ontheradarradio', 'following');

    expect(state).toBeDefined();
    expect(state?.nextCursor).toBe('CURSOR_PAGE_2');
    expect(state?.totalScanned).toBe(50);
    expect(state?.totalQualified).toBe(12);

    await recordScannedProfiles('ontheradarradio', [
      { username: 'rapper_a', isQualified: true, category: 'Артист' },
      { username: 'producer_b', isQualified: false, category: 'Продюсер' },
    ]);

    const known = await getKnownScannedUsernames('ontheradarradio');
    expect(known.has('rapper_a')).toBe(true);
    expect(known.has('producer_b')).toBe(true);
    expect(known.has('unknown_artist')).toBe(false);
  });

  test('InstagramSessionClient automatically extracts dsUserId from sessionId cookie format', () => {
    const client = new InstagramSessionClient({
      sessionId: '5596545124%3ACiX0GMwypEtltp%3A1%3AAYnJIax',
    });
    // Access headers to verify ds_user_id was auto-populated
    const headers = (client as any).getHeaders();
    expect(headers['Cookie']).toContain('ds_user_id=5596545124');
  });

  test('InstagramSessionClient ensureCsrfToken fetches csrftoken from cookies', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: () => ['csrftoken=mock_token_abc; Path=/; Domain=.instagram.com'],
        get: () => 'csrftoken=mock_token_abc; Path=/',
      },
    });

    const client = new InstagramSessionClient({ sessionId: 'mock-session-123' });
    const token = await client.ensureCsrfToken();
    expect(token).toBe('mock_token_abc');
  });

  test('InstagramSessionClient resolves numeric user ID with escaped owner_id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(`
        {"context":{"username":"yrkblz","owner_id":"5596545124"}}
      `),
    });

    const client = new InstagramSessionClient({ sessionId: 'mock-session-123' });
    const userId = await client.resolveUserId('yrkblz');

    expect(userId).toBe('5596545124');
  });
});

