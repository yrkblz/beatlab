import {
  extractUsernamesFromInstagramData,
  compareInstagramExportData,
} from '../instagram-data-importer';

describe('instagram-data-importer', () => {
  const sampleFollowersJson = JSON.stringify([
    {
      title: '',
      string_list_data: [
        {
          href: 'https://www.instagram.com/alekwlkicki',
          value: 'alekwlkicki',
          timestamp: 1690000000,
        },
      ],
    },
    {
      title: '',
      string_list_data: [
        {
          href: 'https://www.instagram.com/mutual_friend',
          value: 'mutual_friend',
          timestamp: 1690000100,
        },
      ],
    },
    {
      title: '',
      string_list_data: [
        {
          href: 'https://www.instagram.com/fan_only',
          value: 'fan_only',
          timestamp: 1690000200,
        },
      ],
    },
  ]);

  const sampleFollowingJson = JSON.stringify({
    relationships_following: [
      {
        title: 'alekwlkicki',
        string_list_data: [
          {
            href: 'https://www.instagram.com/alekwlkicki',
            value: 'alekwlkicki',
            timestamp: 1690000000,
          },
        ],
      },
      {
        title: 'mutual_friend',
        string_list_data: [
          {
            href: 'https://www.instagram.com/mutual_friend',
            value: 'mutual_friend',
            timestamp: 1690000100,
          },
        ],
      },
      {
        title: 'not_following_back_guy',
        string_list_data: [
          {
            href: 'https://www.instagram.com/not_following_back_guy',
            value: 'not_following_back_guy',
            timestamp: 1690000300,
          },
        ],
      },
    ],
  });

  describe('extractUsernamesFromInstagramData', () => {
    it('extracts usernames from JSON array format (followers_1.json)', () => {
      const users = extractUsernamesFromInstagramData(sampleFollowersJson);
      expect(users.map((u) => u.username)).toEqual(['alekwlkicki', 'mutual_friend', 'fan_only']);
    });

    it('extracts usernames from JSON object format (following.json)', () => {
      const users = extractUsernamesFromInstagramData(sampleFollowingJson);
      expect(users.map((u) => u.username)).toEqual([
        'alekwlkicki',
        'mutual_friend',
        'not_following_back_guy',
      ]);
    });

    it('extracts usernames from exported HTML file via href links', () => {
      const html = `
        <html><body>
          <a target="_blank" href="https://www.instagram.com/user_one">user_one</a>
          <a target="_blank" href="https://www.instagram.com/user_two/">user_two</a>
        </body></html>
      `;
      const users = extractUsernamesFromInstagramData(html);
      expect(users.map((u) => u.username)).toEqual(['user_one', 'user_two']);
    });
  });

  describe('compareInstagramExportData', () => {
    it('accurately identifies notFollowingBack, fans, and mutuals with zero false positives', () => {
      const result = compareInstagramExportData(sampleFollowersJson, sampleFollowingJson);

      expect(result.totalFollowers).toBe(3);
      expect(result.totalFollowing).toBe(3);

      // alekwlkicki follows back, so he MUST NOT be in notFollowingBack!
      const notFollowingBackHandles = result.notFollowingBack.map((u) => u.username);
      expect(notFollowingBackHandles).not.toContain('alekwlkicki');
      expect(notFollowingBackHandles).not.toContain('mutual_friend');
      expect(notFollowingBackHandles).toEqual(['not_following_back_guy']);

      // fan_only follows user, but user does not follow back
      const fanHandles = result.fans.map((u) => u.username);
      expect(fanHandles).toEqual(['fan_only']);

      // mutuals
      const mutualHandles = result.mutuals.map((u) => u.username);
      expect(mutualHandles).toEqual(['alekwlkicki', 'mutual_friend']);
    });
  });
});
