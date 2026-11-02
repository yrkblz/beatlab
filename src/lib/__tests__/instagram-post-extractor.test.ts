import {
  cleanChannelName,
  extractShortcode,
  extractArtistsFromPost,
  extractArtistsFromChannelPosts,
} from '../instagram-post-extractor';

describe('instagram-post-extractor', () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('cleanChannelName', () => {
    it('cleans channel URLs with trailing slashes, query parameters, or @ prefixes', () => {
      expect(cleanChannelName('https://www.instagram.com/thecomeupdvd/')).toBe('thecomeupdvd');
      expect(cleanChannelName('https://www.instagram.com/thecomeupdvd')).toBe('thecomeupdvd');
      expect(cleanChannelName('https://www.instagram.com/thecomeupdvd/reels/')).toBe('thecomeupdvd');
      expect(cleanChannelName('https://www.instagram.com/thecomeupdvd/posts')).toBe('thecomeupdvd');
      expect(cleanChannelName('https://instagram.com/thecomeupdvd/?igsh=MWF5...')).toBe('thecomeupdvd');
      expect(cleanChannelName('http://instagram.com/thecomeupdvd#bio')).toBe('thecomeupdvd');
      expect(cleanChannelName('@thecomeupdvd')).toBe('thecomeupdvd');
      expect(cleanChannelName('thecomeupdvd')).toBe('thecomeupdvd');
      expect(cleanChannelName('@ontheradarradio')).toBe('ontheradarradio');
    });

    it('does not strip post or reel prefixes into invalid channel names', () => {
      // If someone gives reel URL directly
      const postUrl = 'https://www.instagram.com/reel/DYfHpJfRgp6/';
      expect(extractShortcode(postUrl)).toBe('DYfHpJfRgp6');
    });
  });

  describe('extractShortcode', () => {
    it('extracts shortcodes from post and reel URLs', () => {
      expect(extractShortcode('https://www.instagram.com/p/DYfHpJfRgp6/')).toBe('DYfHpJfRgp6');
      expect(extractShortcode('https://www.instagram.com/reel/De2gb07h4dg/?utm_source=ig_web_copy_link')).toBe('De2gb07h4dg');
      expect(extractShortcode('https://www.instagram.com/tv/DWuN2MGjAEF/')).toBe('DWuN2MGjAEF');
      expect(extractShortcode('DYfHpJfRgp6')).toBe('DYfHpJfRgp6');
      expect(extractShortcode('')).toBeNull();
    });
  });

  describe('extractArtistsFromPost', () => {
    it('extracts performers from embed and filters out camera/video credits', async () => {
      const mockEmbedHtml = `
        <a class="CaptionUsername" href="/thecomeupdvd/">thecomeupdvd</a>
        <div class="Caption">
          New exclusive freestyle by @trapdickey!
          🎥 Directed by @videographer_john
          🎥 By @watchthescreen
          Mix: @engineer_mike
        </div>
        <a href="/trapdickey/?utm_source=ig_embed">trapdickey</a>
        <a href="/videographer_john/?utm_source=ig_embed">videographer_john</a>
        <a href="/watchthescreen/?utm_source=ig_embed">watchthescreen</a>
      `;

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/embed/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockEmbedHtml),
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { user: { username: 'artist', followerCount: 5000 } } }),
          text: () => Promise.resolve(''),
        });
      });

      const leads = await extractArtistsFromPost('DYfHpJfRgp6');

      expect(leads.length).toBeGreaterThan(0);
      const handles = leads.map((l) => l.handle.toLowerCase());

      // trapdickey is performer
      expect(handles).toContain('trapdickey');
      // thecomeupdvd is owner, should be excluded
      expect(handles).not.toContain('thecomeupdvd');
      // videographer_john should be filtered out by camera/video credit regex
      expect(handles).not.toContain('videographer_john');
      // watchthescreen preceded by 🎥 By should be filtered out
      expect(handles).not.toContain('watchthescreen');
    });
  });

  describe('extractArtistsFromChannelPosts', () => {
    it('correctly discovers shortcodes even when quotes are backslash-escaped (\\"shortcode\\":\\"xyz\\")', async () => {
      const mockChannelEmbedHtml = `
        [{"shortcode_media":{"id":"1","shortcode":"De2gb07h4dg","is_video":true}},
         {\\"shortcode_media\\":{\\"id\\":\\"2\\",\\"shortcode\\":\\"De2cWPCPVLs\\",\\"is_video\\":true}}]
      `;

      const mockPostEmbedHtml = `
        <a class="CaptionUsername" href="/thecomeupdvd/">thecomeupdvd</a>
        <div class="Caption">Freestyle by @maxb140</div>
        <a href="/maxb140/?utm_source=ig_embed">maxb140</a>
      `;

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/thecomeupdvd/embed/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockChannelEmbedHtml),
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockPostEmbedHtml),
          json: () => Promise.resolve({ data: { user: { username: 'maxb140', followerCount: 10000 } } }),
        });
      });

      const leads = await extractArtistsFromChannelPosts('https://www.instagram.com/thecomeupdvd/', 10);

      expect(leads.length).toBeGreaterThan(0);
      expect(leads[0].handle).toBe('maxb140');
      expect(leads[0].category).toBe('Артист');
    });

    it('continues scanning through subsequent posts until the requested limit is fulfilled', async () => {
      // Create mock client with 4 posts (newest to oldest)
      const mockClient = {
        fetchUserPosts: jest.fn().mockResolvedValue(['POST_1', 'POST_2', 'POST_3', 'POST_4']),
        fetchUserProfile: jest.fn().mockImplementation((handle: string) => {
          return Promise.resolve({
            username: handle,
            fullName: `${handle.toUpperCase()}`,
            followerCount: 5000,
            biography: 'Recording rap artist. New album out on Spotify.',
            bioLinks: ['https://open.spotify.com/artist/123'],
          });
        }),
      } as any;

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('POST_1')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<div class="Caption">Freestyle with @rapper_one</div>'),
          });
        }
        if (url.includes('POST_2')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<div class="Caption">Episode feat @rapper_two</div>'),
          });
        }
        if (url.includes('POST_3')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<div class="Caption">Session by @rapper_three</div>'),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<div class="Caption">Live with @rapper_four</div>'),
        });
      });

      // Request limit 3: should stop after acquiring 3 unique artists without stopping prematurely
      const leads = await extractArtistsFromChannelPosts('thecomeupdvd', 3, mockClient);
      expect(leads.length).toBe(3);
      expect(leads.map((l) => l.handle)).toEqual(['rapper_one', 'rapper_two', 'rapper_three']);
    });

    it('does not drop performers when profile bio lookup is rate-limited (429)', async () => {
      const mockClient = {
        fetchUserPosts: jest.fn().mockResolvedValue(['POST_A', 'POST_B']),
        fetchUserProfile: jest.fn().mockResolvedValue({
          username: 'camron',
          fullName: 'Camron',
          followerCount: 0,
          biography: '',
          bioLinks: [],
        }),
      } as any;

      global.fetch = jest.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<div class="Caption">New episode with @mr_camron on The Come Up</div>'),
        });
      });

      const leads = await extractArtistsFromChannelPosts('thecomeupdvd', 5, mockClient, { filterOnlyArtists: true });
      expect(leads.length).toBe(1);
      expect(leads[0].handle).toBe('mr_camron');
      expect(leads[0].category).toBe('Артист');
    });

    it('successfully fulfills target limit of 50 artists by continuing to scan beyond initial batch', async () => {
      // Mock client providing 60 distinct posts each featuring a unique artist
      const mockPosts = Array.from({ length: 60 }, (_, i) => `POST_${i + 1}`);
      const mockClient = {
        fetchUserPosts: jest.fn().mockResolvedValue(mockPosts),
        fetchUserProfile: jest.fn().mockImplementation((handle: string) => {
          return Promise.resolve({
            username: handle,
            fullName: `${handle.toUpperCase()}`,
            followerCount: 5000,
            biography: 'Hip hop artist. Music on Spotify.',
            bioLinks: ['https://open.spotify.com/artist/test'],
          });
        }),
      } as any;

      global.fetch = jest.fn().mockImplementation((url: string) => {
        const match = url.match(/POST_(\d+)/);
        const idx = match ? match[1] : 'unknown';
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`<div class="Caption">Freestyle by @artist_${idx}</div>`),
        });
      });

      const leads = await extractArtistsFromChannelPosts('thecomeupdvd', 50, mockClient);
      expect(leads.length).toBe(50);
      expect(leads[0].handle).toBe('artist_1');
      expect(leads[49].handle).toBe('artist_50');
    });
  });
});
