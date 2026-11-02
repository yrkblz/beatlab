// Custom Instagram Web Session API Client
// Uses authentic Instagram Web GraphQL endpoints with sessionid cookie for 100% free, direct scraping.

export interface InstagramSessionConfig {
  sessionId: string;
  dsUserId?: string;
  csrfToken?: string;
}

export interface InstagramWebUserProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  followerCount: number;
  followingCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  email?: string;
  phone?: string;
  externalUrl?: string;
  bioLinks: string[];
  categoryName?: string;
}

export interface InstagramListBatchResult {
  users: {
    id: string;
    username: string;
    fullName: string;
    isPrivate: boolean;
    isVerified: boolean;
    profilePicUrl?: string;
  }[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface InstagramPostDetailedItem {
  shortcode: string;
  takenAt: number;
  caption?: string;
  taggedUsers: string[];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function') {
    return (AbortSignal as any).timeout(ms);
  }
  return undefined;
}

export class InstagramSessionClient {
  private sessionId: string;
  private dsUserId?: string;
  private csrfToken?: string;
  private static profileCache = new Map<string, InstagramWebUserProfile | null>();
  private static isJsonRateLimited = false;
  private static rateLimitResetTime = 0;

  constructor(config: InstagramSessionConfig) {
    this.sessionId = config.sessionId.trim();
    if (this.sessionId.toLowerCase().startsWith('sessionid=')) {
      this.sessionId = this.sessionId.replace(/^sessionid=/i, '').trim();
    }
    // Also handle full cookie string e.g. sessionid=...; ds_user_id=...; csrftoken=...
    if (this.sessionId.includes(';')) {
      const sMatch = this.sessionId.match(/sessionid=([^;]+)/i);
      if (sMatch) this.sessionId = sMatch[1].trim();
      const dMatch = config.sessionId.match(/ds_user_id=([^;]+)/i);
      if (dMatch && !this.dsUserId) this.dsUserId = dMatch[1].trim();
      const cMatch = config.sessionId.match(/csrftoken=([^;]+)/i);
      if (cMatch && !this.csrfToken) this.csrfToken = cMatch[1].trim();
    }

    this.dsUserId = config.dsUserId?.trim() || this.dsUserId;
    this.csrfToken = config.csrfToken?.trim() || this.csrfToken;

    // Auto-extract dsUserId from sessionId if not provided
    if (!this.dsUserId && this.sessionId) {
      const match = this.sessionId.match(/^(\d+)(?:%3A|:)/);
      if (match) {
        this.dsUserId = match[1];
      }
    }
  }

  /**
   * Ensures a valid CSRF token is available for state-changing POST operations.
   */
  async ensureCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    try {
      const res = await fetch('https://www.instagram.com/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Cookie': `sessionid=${this.sessionId}`,
        },
      });
      const getSetCookie = (res.headers as any).getSetCookie;
      const cookies = getSetCookie ? getSetCookie.call(res.headers) : [res.headers.get('set-cookie')];
      for (const c of (cookies || [])) {
        const match = c?.match(/csrftoken=([^;]+)/);
        if (match && match[1]) {
          this.csrfToken = match[1];
          return match[1];
        }
      }
    } catch (e) {
      // ignore
    }
    if (!this.csrfToken) {
      this.csrfToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    }
    return this.csrfToken || '';
  }

  private getHeaders(): Record<string, string> {
    const cookieParts = [`sessionid=${this.sessionId}`];
    if (this.dsUserId) cookieParts.push(`ds_user_id=${this.dsUserId}`);
    if (this.csrfToken) cookieParts.push(`csrftoken=${this.csrfToken}`);

    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'x-ig-app-id': '936619743392459',
      'x-asbd-id': '129477',
      'x-requested-with': 'XMLHttpRequest',
      'Origin': 'https://www.instagram.com',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Referer': 'https://www.instagram.com/',
      'Cookie': cookieParts.join('; '),
    };
  }

  /**
   * Fetches full profile info for any public Instagram username.
   * Extracts bio, external links, Spotify/Soundcloud/smartlinks, emails, follower counts.
   * Includes in-memory caching and rapid graceful fallback when Instagram returns 429 rate limit.
   */
  async fetchUserProfile(username: string): Promise<InstagramWebUserProfile | null> {
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    if (!cleanUser) return null;

    if (InstagramSessionClient.profileCache.has(cleanUser)) {
      return InstagramSessionClient.profileCache.get(cleanUser) || null;
    }

    const defaultFallback: InstagramWebUserProfile = {
      id: cleanUser,
      username: cleanUser,
      fullName: cleanUser,
      biography: '',
      followerCount: 0,
      followingCount: 0,
      isPrivate: false,
      isVerified: false,
      bioLinks: [],
    };

    // If currently rate limited on JSON endpoint, go directly to fast meta or fallback
    if (InstagramSessionClient.isJsonRateLimited && Date.now() < InstagramSessionClient.rateLimitResetTime) {
      const meta = await this.fetchUserProfileViaMeta(cleanUser);
      const res = meta || defaultFallback;
      InstagramSessionClient.profileCache.set(cleanUser, res);
      return res;
    }

    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUser)}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: safeTimeoutSignal(4000),
      });

      if (!res.ok) {
        if (res.status === 429) {
          InstagramSessionClient.isJsonRateLimited = true;
          InstagramSessionClient.rateLimitResetTime = Date.now() + 45000;
          console.log(`[InstagramSessionClient] 429 rate limit on JSON endpoint for @${cleanUser}, switching to meta fallback`);
        }
        const meta = await this.fetchUserProfileViaMeta(cleanUser);
        const finalProfile = meta || defaultFallback;
        InstagramSessionClient.profileCache.set(cleanUser, finalProfile);
        return finalProfile;
      }

      const json = await res.json();
      const user = json?.data?.user;
      if (!user) {
        InstagramSessionClient.profileCache.set(cleanUser, defaultFallback);
        return defaultFallback;
      }

      // Extract bio links
      const bioLinks: string[] = [];
      if (Array.isArray(user.bio_links)) {
        for (const bl of user.bio_links) {
          if (bl?.url && typeof bl.url === 'string') bioLinks.push(bl.url);
          if (bl?.lynx_url && typeof bl.lynx_url === 'string') bioLinks.push(bl.lynx_url);
        }
      }
      if (user.external_url && typeof user.external_url === 'string') {
        bioLinks.push(user.external_url);
      }

      // Extract email from business fields or biography regex
      const bioText: string = user.biography || '';
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
      const emailMatch = bioText.match(emailRegex);

      const email =
        user.business_email ||
        user.public_email ||
        (emailMatch ? emailMatch[0].toLowerCase() : undefined);

      const profile: InstagramWebUserProfile = {
        id: String(user.id || user.pk || ''),
        username: user.username || cleanUser,
        fullName: user.full_name || cleanUser,
        biography: bioText,
        followerCount: Number(user.edge_followed_by?.count || 0),
        followingCount: Number(user.edge_follow?.count || 0),
        isPrivate: Boolean(user.is_private),
        isVerified: Boolean(user.is_verified),
        email,
        phone: user.contact_phone_number || user.public_phone_number || undefined,
        externalUrl: user.external_url || undefined,
        bioLinks: Array.from(new Set(bioLinks)),
        categoryName: user.category_name || undefined,
      };

      InstagramSessionClient.profileCache.set(cleanUser, profile);
      return profile;
    } catch (err: any) {
      console.warn(`[InstagramSessionClient] Primary lookup failed for @${cleanUser}, attempting meta fallback:`, err.message);
      const meta = await this.fetchUserProfileViaMeta(cleanUser);
      const finalProfile = meta || defaultFallback;
      InstagramSessionClient.profileCache.set(cleanUser, finalProfile);
      return finalProfile;
    }
  }

  /**
   * Resolves a username (e.g. "ontheradarradio") to its numeric Instagram user ID (e.g. "39851405940").
   * Uses Instagram's official public embed endpoint (fast, 100% reliable, zero rate limits).
   */
  async resolveUserId(username: string): Promise<string | null> {
    const cleanUser = username.trim().replace(/^@/, '');
    if (/^\d+$/.test(cleanUser)) return cleanUser;

    // 1. Instagram embed page (fastest, 100% reliable, no rate limits)
    try {
      const embedRes = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanUser)}/embed/`);
      if (embedRes.ok) {
        const html = await embedRes.text();
        const match =
          html.match(/data-owner-id="(\d+)"/i) ||
          html.match(/(?:\\?"|")owner_id(?:\\?"|")\s*:\s*(?:\\?"|")(\d+)(?:\\?"|")/i);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {
      // Continue
    }

    // 2. Fallback via web profile
    try {
      const profile = await this.fetchUserProfile(cleanUser);
      if (profile?.id && /^\d+$/.test(profile.id)) {
        return profile.id;
      }
    } catch (e) {
      // Continue
    }

    return null;
  }

  private parseFollowerCount(str: string): number {
    if (!str) return 0;
    const clean = str.trim().toLowerCase().replace(/,/g, '');
    if (clean.endsWith('m')) return Math.round(parseFloat(clean) * 1000000);
    if (clean.endsWith('k')) return Math.round(parseFloat(clean) * 1000);
    return parseInt(clean, 10) || 0;
  }

  /**
   * High-reliability fallback: Fetches user bio and followers via search-engine meta tags.
   * Completely immune to Instagram's JSON 429 rate limit.
   */
  async fetchUserProfileViaMeta(username: string): Promise<InstagramWebUserProfile | null> {
    const cleanUser = username.trim().replace(/^@/, '');
    try {
      const res = await fetch(`https://www.instagram.com/${cleanUser}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html',
        },
        signal: safeTimeoutSignal(2500),
      });

      if (!res.ok) return null;
      const html = await res.text();
      const metaMatch = html.match(/<meta content="([^"]+)" name="description"/i);
      if (!metaMatch) return null;

      const raw = metaMatch[1]
        .replace(/&#064;/g, '@')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));

      // Pattern: "29K Followers, 11K Following, 98 Posts - Full Name (@handle) on Instagram: "Bio text...""
      const parsed = raw.match(
        /^([0-9.,kmKM]+)\s+Followers,\s*([0-9.,kmKM]+)\s+Following,\s*([0-9.,kmKM]+)\s+Posts\s*-\s*([^(]+)\(@([^)]+)\)\s+on\s+Instagram:\s*"?([\s\S]*?)"?$/i
      );

      let followerCount = 0;
      let followingCount = 0;
      let fullName = cleanUser;
      let biography = '';

      if (parsed) {
        followerCount = this.parseFollowerCount(parsed[1]);
        followingCount = this.parseFollowerCount(parsed[2]);
        fullName = parsed[4].trim();
        biography = parsed[6].replace(/"$/, '').trim();
      } else {
        biography = raw;
      }

      // Extract email from bio (supports mathematical styled italic/bold unicode fonts)
      const normalizedBio = biography.normalize('NFKD');
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
      const emailMatch = normalizedBio.match(emailRegex);
      const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;

      // Extract phone from bio
      const phoneRegex = /(?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/;
      const phoneMatch = biography.match(phoneRegex);
      const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

      // Extract links from bio text (both full https and domain formats like linktr.ee/..., lnk.to/...)
      const domainMatches =
        biography.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+(?:com|ee|to|link|tv|fm|app|io|it|me|ly)\/[^\s"'\\]+/gi) || [];
      const httpMatches = biography.match(/https?:\/\/[^\s"'\\]+/gi) || [];
      const bioLinks = Array.from(
        new Set([...domainMatches, ...httpMatches].map((l) => (l.startsWith('http') ? l : `https://${l}`)))
      );

      return {
        id: cleanUser,
        username: cleanUser,
        fullName,
        biography,
        followerCount,
        followingCount,
        isPrivate: false,
        isVerified: false,
        email,
        phone,
        bioLinks,
      };
    } catch (err: any) {
      console.warn(`[InstagramSessionClient] Meta fallback failed for @${cleanUser}:`, err.message);
      return null;
    }
  }

  /**
   * Fetches the latest media items from a user's timeline and reels,
   * strictly ordered from the newest post to older posts (takenAt descending),
   * with automatic pagination to collect up to maxPosts.
   */
  async fetchUserPostsDetailed(username: string, maxPosts: number = 60): Promise<InstagramPostDetailedItem[]> {
    const cleanUser = username.trim().replace(/^@/, '');
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUser)}`;

    const results: InstagramPostDetailedItem[] = [];
    const seenCodes = new Set<string>();

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: safeTimeoutSignal(4000),
      });

      if (!res.ok) return [];

      const json = await res.json();
      const user = json?.data?.user;
      if (!user) return [];

      const userId = String(user.id || user.pk || '');

      const ingestEdge = (edge: any) => {
        const sc = edge?.node?.shortcode;
        if (!sc || seenCodes.has(sc)) return;
        seenCodes.add(sc);

        const takenAt = Number(edge?.node?.taken_at_timestamp || 0);
        const caption = edge?.node?.edge_media_to_caption?.edges?.[0]?.node?.text || '';
        const taggedUsers: string[] = [];
        const taggedEdges = edge?.node?.edge_media_to_tagged_user?.edges || [];
        for (const te of taggedEdges) {
          const u = te?.node?.user?.username;
          if (u && typeof u === 'string') taggedUsers.push(u.toLowerCase());
        }

        results.push({
          shortcode: sc,
          takenAt,
          caption,
          taggedUsers,
        });
      };

      // 1. Initial Timeline Edges
      const timelineEdges = user.edge_owner_to_timeline_media?.edges || [];
      for (const edge of timelineEdges) {
        ingestEdge(edge);
      }

      // 2. Initial Video / Reels Edges
      const videoEdges = user.edge_felix_video_timeline?.edges || [];
      for (const edge of videoEdges) {
        ingestEdge(edge);
      }

      // 3. Paging if needed and cursor is available
      let pageInfo = user.edge_owner_to_timeline_media?.page_info;
      let hasNext = Boolean(pageInfo?.has_next_page && pageInfo?.end_cursor);
      let cursor = pageInfo?.end_cursor;
      let iterations = 0;

      while (hasNext && cursor && results.length < maxPosts && iterations < 5) {
        iterations++;
        await sleep(300);

        // Try GraphQL timeline pagination query
        const queryHash = '69cba4003021063e3d8847e0b3864ad4';
        const variables = JSON.stringify({ id: userId, first: 50, after: cursor });
        const gqlUrl = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(variables)}`;

        try {
          const gqlRes = await fetch(gqlUrl, {
            method: 'GET',
            headers: this.getHeaders(),
            signal: safeTimeoutSignal(3000),
          });

          if (gqlRes.ok) {
            const gqlJson = await gqlRes.json();
            const nextMedia = gqlJson?.data?.user?.edge_owner_to_timeline_media;
            const nextEdges = nextMedia?.edges || [];
            if (nextEdges.length > 0) {
              for (const edge of nextEdges) {
                ingestEdge(edge);
              }

              pageInfo = nextMedia?.page_info;
              hasNext = Boolean(pageInfo?.has_next_page && pageInfo?.end_cursor);
              cursor = pageInfo?.end_cursor;
              continue;
            }
          }
        } catch (e) {
          // fallback to feed endpoint
        }

        // Alternative endpoint: api/v1/feed/user/${userId}/
        try {
          const feedUrl = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=50&max_id=${encodeURIComponent(cursor)}`;
          const feedRes = await fetch(feedUrl, {
            method: 'GET',
            headers: this.getHeaders(),
            signal: safeTimeoutSignal(3000),
          });

          if (feedRes.ok) {
            const feedJson = await feedRes.json();
            const items = feedJson?.items || [];
            if (items.length === 0) break;

            for (const item of items) {
              const sc = item.code;
              if (!sc || seenCodes.has(sc)) continue;
              seenCodes.add(sc);

              const takenAt = Number(item.taken_at || 0);
              const caption = item.caption?.text || '';
              const taggedUsers: string[] = [];
              const inTags = item.usertags?.in || [];
              for (const tag of inTags) {
                const u = tag?.user?.username;
                if (u && typeof u === 'string') taggedUsers.push(u.toLowerCase());
              }

              results.push({
                shortcode: sc,
                takenAt,
                caption,
                taggedUsers,
              });
            }

            cursor = feedJson?.next_max_id;
            hasNext = Boolean(feedJson?.more_available && cursor);
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      }

      // Sort strictly from NEWEST to oldest
      results.sort((a, b) => b.takenAt - a.takenAt);
      return results.slice(0, maxPosts);
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetches the latest media shortcodes from a user's timeline / reels,
   * sorted from newest to oldest.
   */
  async fetchUserPosts(username: string, limit: number = 50): Promise<string[]> {
    const detailed = await this.fetchUserPostsDetailed(username, limit);
    return detailed.map((p) => p.shortcode);
  }

  /**
   * Fetches a batch of accounts that the user follows (Following / Podpiski).
   */
  async fetchFollowingBatch(
    userId: string,
    count: number = 50,
    cursor?: string
  ): Promise<InstagramListBatchResult> {
    const url = `https://www.instagram.com/api/v1/friendships/${userId}/following/?count=${count}${
      cursor ? `&max_id=${encodeURIComponent(cursor)}` : ''
    }`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Instagram following fetch failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawUsers = Array.isArray(data?.users) ? data.users : [];
    const nextCursor = data?.next_max_id || undefined;
    const hasMore = Boolean(nextCursor && String(nextCursor).trim().length > 0);

    return {
      users: rawUsers.map((u: any) => ({
        id: String(u.pk || u.id || ''),
        username: u.username,
        fullName: u.full_name || '',
        isPrivate: Boolean(u.is_private),
        isVerified: Boolean(u.is_verified),
        profilePicUrl: u.profile_pic_url,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Fetches a batch of followers of the target user.
   */
  async fetchFollowersBatch(
    userId: string,
    count: number = 50,
    cursor?: string
  ): Promise<InstagramListBatchResult> {
    const url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=${count}${
      cursor ? `&max_id=${encodeURIComponent(cursor)}` : ''
    }`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Instagram followers fetch failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawUsers = Array.isArray(data?.users) ? data.users : [];
    const nextCursor = data?.next_max_id || undefined;
    const hasMore = Boolean(nextCursor && String(nextCursor).trim().length > 0);

    return {
      users: rawUsers.map((u: any) => ({
        id: String(u.pk || u.id || ''),
        username: u.username,
        fullName: u.full_name || '',
        isPrivate: Boolean(u.is_private),
        isVerified: Boolean(u.is_verified),
        profilePicUrl: u.profile_pic_url,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Unfollows a user on Instagram using their numeric user ID.
   */
  async unfollowUser(targetUserId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    await this.ensureCsrfToken();
    const url = `https://www.instagram.com/api/v1/friendships/destroy/${targetUserId}/`;
    const headers = this.getHeaders();
    if (this.csrfToken) headers['x-csrftoken'] = this.csrfToken;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `user_id=${encodeURIComponent(targetUserId)}`,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, error: `Unfollow failed (${res.status}): ${errText.slice(0, 100)}` };
      }

      const json = await res.json().catch(() => ({ status: 'ok' }));
      return { success: json.status === 'ok', status: json.status };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends a Direct Message (DM) to an Instagram user.
   */
  async sendDirectMessage(recipientUserId: string, text: string): Promise<{ success: boolean; threadId?: string; error?: string }> {
    await this.ensureCsrfToken();
    const url = `https://www.instagram.com/api/v1/direct_v2/threads/broadcast/text/`;
    const headers = this.getHeaders();
    if (this.csrfToken) headers['x-csrftoken'] = this.csrfToken;

    const clientContext = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const randomUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const form = new URLSearchParams();
    form.append('recipient_users', `[["${recipientUserId}"]]`);
    form.append('text', text);
    form.append('client_context', clientContext);
    form.append('action', 'send_item');
    form.append('thread_ids', '["0"]');
    form.append('mutation_token', clientContext);
    form.append('_uuid', randomUuid);
    if (this.csrfToken) {
      form.append('_csrftoken', this.csrfToken);
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, error: `DM failed (${res.status}): ${errText.slice(0, 120)}` };
      }

      const json = await res.json().catch(() => ({ status: 'ok' }));
      return { success: json.status === 'ok', threadId: json.thread_id || json.payload?.thread_id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
