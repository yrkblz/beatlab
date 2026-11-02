/**
 * @jest-environment node
 */

import { POST } from '../instagram-actions/route';
import { InstagramSessionClient } from '@/lib/instagram-session-client';

jest.mock('@/lib/instagram-session-client');

describe('/api/instagram-actions Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.INSTAGRAM_SESSION_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('ACTION: send_dm', () => {
    it('returns 400 when missing recipient or message text', async () => {
      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_dm', text: '' }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Missing recipient or message text');
    });

    it('returns directUrl fallback with informative error when no session ID is available', async () => {
      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_dm',
          recipientUsername: 'trapdickey',
          text: 'Hello, check this beat pack!',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(false);
      expect(json.directUrl).toBe('https://ig.me/m/trapdickey');
      expect(json.error).toContain('Brak Session ID');
    });

    it('successfully sends DM when session ID is valid and recipient is resolved', async () => {
      const mockResolveUserId = jest.fn().mockResolvedValue('11223344');
      const mockSendDirectMessage = jest.fn().mockResolvedValue({
        success: true,
        threadId: 'th_998877',
      });

      (InstagramSessionClient as unknown as jest.Mock).mockImplementation(() => ({
        resolveUserId: mockResolveUserId,
        sendDirectMessage: mockSendDirectMessage,
      }));

      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_dm',
          recipientUsername: '@trapdickey',
          text: 'Check this pack!',
          customSessionId: '5596545124%3Avalid_session_cookie',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.threadId).toBe('th_998877');
      expect(json.directUrl).toBe('https://ig.me/m/trapdickey');
      expect(mockResolveUserId).toHaveBeenCalledWith('trapdickey');
      expect(mockSendDirectMessage).toHaveBeenCalledWith('11223344', 'Check this pack!');
    });
  });

  describe('ACTION: track_unfollowers', () => {
    it('returns 400 when username is missing', async () => {
      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'track_unfollowers' }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Username is required');
    });

    it('returns 400 SESSION_REQUIRED when session ID is missing', async () => {
      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'track_unfollowers', username: 'yrkblz' }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.code).toBe('SESSION_REQUIRED');
      expect(json.error).toContain('Brak aktywnego Session ID');
    });

    it('accurately computes notFollowingBack and fans with full pagination', async () => {
      const mockResolveUserId = jest.fn().mockResolvedValue('5596545124');
      const mockFetchUserProfile = jest.fn().mockResolvedValue({
        id: '5596545124',
        username: 'yrkblz',
        followerCount: 3,
        followingCount: 3,
      });

      // Followers: user_a, user_b, user_c
      const mockFetchFollowersBatch = jest.fn().mockResolvedValueOnce({
        users: [
          { id: '1', username: 'user_a', fullName: 'User A' },
          { id: '2', username: 'user_b', fullName: 'User B' },
          { id: '3', username: 'user_c', fullName: 'User C' },
        ],
        hasMore: false,
      });

      // Following: user_b, user_c, user_d
      // notFollowingBack should be: user_d (followed by yrkblz, but not in followers)
      // fans should be: user_a (follows yrkblz, but yrkblz doesn't follow)
      const mockFetchFollowingBatch = jest.fn().mockResolvedValueOnce({
        users: [
          { id: '2', username: 'user_b', fullName: 'User B' },
          { id: '3', username: 'user_c', fullName: 'User C' },
          { id: '4', username: 'user_d', fullName: 'User D' },
        ],
        hasMore: false,
      });

      (InstagramSessionClient as unknown as jest.Mock).mockImplementation(() => ({
        resolveUserId: mockResolveUserId,
        fetchUserProfile: mockFetchUserProfile,
        fetchFollowersBatch: mockFetchFollowersBatch,
        fetchFollowingBatch: mockFetchFollowingBatch,
      }));

      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_unfollowers',
          username: 'yrkblz',
          customSessionId: '5596545124%3Asession_123',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.account.username).toBe('yrkblz');
      expect(json.scannedFollowersCount).toBe(3);
      expect(json.scannedFollowingCount).toBe(3);

      // Verify notFollowingBack: user_d only
      expect(json.notFollowingBack).toHaveLength(1);
      expect(json.notFollowingBack[0].username).toBe('user_d');

      // Verify fans: user_a only
      expect(json.fans).toHaveLength(1);
      expect(json.fans[0].username).toBe('user_a');
    });

    it('returns CHECKPOINT_REQUIRED when Instagram flags session', async () => {
      const mockResolveUserId = jest.fn().mockResolvedValue('5596545124');
      const mockFetchUserProfile = jest.fn().mockResolvedValue({
        id: '5596545124',
        username: 'yrkblz',
        followerCount: 50,
        followingCount: 50,
      });

      const mockFetchFollowersBatch = jest
        .fn()
        .mockRejectedValue(new Error('Instagram following fetch failed: checkpoint_required suspended'));

      (InstagramSessionClient as unknown as jest.Mock).mockImplementation(() => ({
        resolveUserId: mockResolveUserId,
        fetchUserProfile: mockFetchUserProfile,
        fetchFollowersBatch: mockFetchFollowersBatch,
      }));

      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_unfollowers',
          username: 'yrkblz',
          customSessionId: '5596545124%3Asession_123',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.code).toBe('CHECKPOINT_REQUIRED');
      expect(json.error).toContain('Sesja Instagrama wygasła');
    });

    it('correctly cleans sessionid= prefix and detects partial scan when followers are truncated', async () => {
      const mockResolveUserId = jest.fn().mockResolvedValue('5596545124');
      const mockFetchUserProfile = jest.fn().mockResolvedValue({
        id: '5596545124',
        username: 'yrkblz',
        followerCount: 796,
        followingCount: 244,
      });

      // Returns only 50 users out of 796
      const mockFetchFollowersBatch = jest.fn().mockResolvedValueOnce({
        users: Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, username: `follower_${i}` })),
        hasMore: false,
      });

      const mockFetchFollowingBatch = jest.fn().mockResolvedValueOnce({
        users: Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, username: `following_${i}` })),
        hasMore: false,
      });

      (InstagramSessionClient as unknown as jest.Mock).mockImplementation(() => ({
        resolveUserId: mockResolveUserId,
        fetchUserProfile: mockFetchUserProfile,
        fetchFollowersBatch: mockFetchFollowersBatch,
        fetchFollowingBatch: mockFetchFollowingBatch,
      }));

      const req = new Request('http://localhost:3000/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_unfollowers',
          username: 'yrkblz',
          customSessionId: 'sessionid=5596545124%3Asession_with_prefix; ds_user_id=5596545124',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.isPartialScan).toBe(true);
      expect(json.scannedFollowersCount).toBe(50);
      expect(json.account.totalFollowers).toBe(796);
    });
  });
});
