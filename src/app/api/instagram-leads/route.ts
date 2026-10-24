import { NextResponse } from 'next/server';

export interface RawProfileData {
  username: string;
  full_name?: string;
  biography?: string;
  follower_count?: number;
  public_email?: string;
  contact_phone_number?: string;
  external_url?: string;
  external_lynx_url?: string;
  bio_links?: { url?: string; title?: string }[];
  is_verified?: boolean;
}

export interface InstagramLeadItem {
  handle: string;
  profileUrl: string;
  category: 'Артист' | 'Продюсер' | 'Звукорежиссёр' | 'Не определён';
  fullName: string;
  bio: string;
  followers: number;
  email?: string;
  phone?: string;
  publicLinks: string[];
  dataStatus: 'AVAILABLE';
  categoryCheck: 'CHECKED';
  sourceType: 'Подписчики' | 'Подписки' | 'Комментарии' | 'Хэштег';
  matchedKeywords: string[];
}

// Keyword dictionaries for role classification
const ARTIST_KEYWORDS = [
  'rapper',
  'artist',
  'mc',
  'singer',
  'vocalist',
  'musician',
  'songwriter',
  'recording artist',
  'hip hop',
  'rap',
  'drill',
  'trap',
  'music',
  'single out',
  'new single',
  'album',
  'ep',
  'presave',
  'pre-save',
  'spotify',
  'soundcloud',
  'apple music',
  'audiomack',
  'distrokid',
  'bandcamp',
  'tidal',
  'youtube.com/watch',
  'youtu.be',
  'linktr.ee',
];

const PRODUCER_KEYWORDS = [
  'producer',
  'prod by',
  'prod.',
  'beatmaker',
  'beats',
  '808',
  'sound kit',
  'drum kit',
  'fl studio',
  'ableton',
  'logic pro',
  'type beat',
  'loopmaker',
  'sample maker',
];

const ENGINEER_KEYWORDS = [
  'engineer',
  'sound engineer',
  'audio engineer',
  'mixing',
  'mastering',
  'mix & master',
  'mix and master',
  'studio engineer',
];

export function extractEmail(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  return match ? match[0].toLowerCase() : undefined;
}

export function extractLinks(bio: string, rawLinks?: any[]): string[] {
  const linksSet = new Set<string>();

  if (rawLinks && Array.isArray(rawLinks)) {
    for (const l of rawLinks) {
      if (typeof l === 'string' && l.startsWith('http')) linksSet.add(l);
      else if (l?.url && typeof l.url === 'string') linksSet.add(l.url);
    }
  }

  // Regex for urls in bio text
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = bio.match(urlRegex);
  if (matches) {
    for (const m of matches) {
      linksSet.add(m);
    }
  }

  return Array.from(linksSet);
}

export function classifyProfile(bio: string, links: string[]): {
  category: 'Артист' | 'Продюсер' | 'Звукорежиссёр' | 'Не определён';
  matchedKeywords: string[];
} {
  const textToScan = `${bio} ${links.join(' ')}`.toLowerCase();
  const matchedKeywords: string[] = [];

  // 1. Check Artist keywords
  for (const kw of ARTIST_KEYWORDS) {
    if (textToScan.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  // 2. Check Producer keywords
  const matchedProducerKw: string[] = [];
  for (const kw of PRODUCER_KEYWORDS) {
    if (textToScan.includes(kw)) {
      matchedProducerKw.push(kw);
    }
  }

  // 3. Check Engineer keywords
  const matchedEngineerKw: string[] = [];
  for (const kw of ENGINEER_KEYWORDS) {
    if (textToScan.includes(kw)) {
      matchedEngineerKw.push(kw);
    }
  }

  if (matchedKeywords.length > 0 && matchedKeywords.length >= matchedProducerKw.length) {
    return { category: 'Артист', matchedKeywords: Array.from(new Set(matchedKeywords)) };
  }

  if (matchedProducerKw.length > 0) {
    return { category: 'Продюсер', matchedKeywords: Array.from(new Set(matchedProducerKw)) };
  }

  if (matchedEngineerKw.length > 0) {
    return { category: 'Звукорежиссёр', matchedKeywords: Array.from(new Set(matchedEngineerKw)) };
  }

  return { category: 'Не определён', matchedKeywords: [] };
}

export function cleanUsername(input: string): string {
  let clean = input.trim();
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  // If full url https://instagram.com/username/ or https://www.instagram.com/username
  const urlMatch = clean.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (urlMatch && urlMatch[1] && !['p', 'reel', 'stories', 'explore'].includes(urlMatch[1])) {
    return urlMatch[1].replace(/^@/, '');
  }
  return clean.replace(/^@/, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      source,
      mode = 'followers',
      limit = 50,
      minFollowers = 500,
      maxFollowers = 200000,
      roleFilters = ['artist', 'producer'],
      onlyWithContact = false,
      keepUncategorized = false,
      apiKey: clientApiKey,
      apiHost: clientApiHost,
    } = body;

    if (!source || typeof source !== 'string' || !source.trim()) {
      return NextResponse.json({ error: 'Please enter a target Instagram profile, post URL or hashtag.' }, { status: 400 });
    }

    const apiKey = clientApiKey || process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'RapidAPI key is missing. Please provide your RAPIDAPI_KEY in .env.local or enter it in the Settings drawer.',
        code: 'MISSING_API_KEY'
      }, { status: 401 });
    }

    const targetUsername = cleanUsername(source);
    const parsedLimit = Math.min(200, Math.max(10, Number(limit) || 50));

    // Resolve source type label matching the user's Excel column "Откуда взяли"
    const sourceTypeLabel: 'Подписчики' | 'Подписки' | 'Комментарии' | 'Хэштег' = 
      mode === 'following' ? 'Подписки' :
      mode === 'comments' ? 'Комментарии' :
      mode === 'hashtag' ? 'Хэштег' : 'Подписчики';

    // Support both Instagram Scraper Stable API (RockSolid APIs) and Instagram Scraper API2
    const rapidApiHost = clientApiHost || process.env.INSTAGRAM_RAPIDAPI_HOST || 'instagram-scraper-stable-api.p.rapidapi.com';

    let rapidRes: Response;
    if (rapidApiHost.includes('stable') || rapidApiHost.includes('rocksolid')) {
      const formBody = new URLSearchParams();
      formBody.append('username_or_url', targetUsername);
      formBody.append('amount', String(parsedLimit));

      if (mode === 'following') {
        formBody.append('data', 'following');
      } else if (mode === 'comments') {
        formBody.append('data', 'comments');
      } else if (mode === 'hashtag') {
        formBody.append('data', 'hashtag');
        formBody.append('hashtag', targetUsername);
      } else {
        formBody.append('data', 'followers');
      }

      rapidRes = await fetch(`https://${rapidApiHost}/`, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': rapidApiHost,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });
    } else {
      let endpointUrl = '';
      if (mode === 'followers') {
        endpointUrl = `https://${rapidApiHost}/v1/followers?username_or_id_or_url=${encodeURIComponent(targetUsername)}&amount=${parsedLimit}`;
      } else if (mode === 'following') {
        endpointUrl = `https://${rapidApiHost}/v1/following?username_or_id_or_url=${encodeURIComponent(targetUsername)}&amount=${parsedLimit}`;
      } else if (mode === 'comments') {
        endpointUrl = `https://${rapidApiHost}/v1/comments?code_or_id_or_url=${encodeURIComponent(source)}&amount=${parsedLimit}`;
      } else {
        endpointUrl = `https://${rapidApiHost}/v1/hashtag?hashtag=${encodeURIComponent(targetUsername)}&amount=${parsedLimit}`;
      }

      rapidRes = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': rapidApiHost,
        },
      });
    }

    const rapidData = await rapidRes.json();

    if (!rapidRes.ok) {
      const errorMsg = rapidData?.message || rapidData?.error || `RapidAPI error status ${rapidRes.status}`;
      return NextResponse.json({ error: errorMsg }, { status: rapidRes.status });
    }

    // Extract profiles list from response structure
    let rawItems: any[] = [];
    if (Array.isArray(rapidData?.data?.items)) {
      rawItems = rapidData.data.items;
    } else if (Array.isArray(rapidData?.data)) {
      rawItems = rapidData.data;
    } else if (Array.isArray(rapidData?.items)) {
      rawItems = rapidData.items;
    } else if (Array.isArray(rapidData?.users)) {
      rawItems = rapidData.users;
    } else if (Array.isArray(rapidData)) {
      rawItems = rapidData;
    }

    if (rawItems.length === 0) {
      return NextResponse.json({
        leads: [],
        message: 'No profiles found for this source or limit reached.',
      });
    }

    // Transform and classify profiles
    const leads: InstagramLeadItem[] = [];

    for (const item of rawItems) {
      const username = item.username || item.user?.username || item.owner?.username;
      if (!username) continue;

      const fullName = item.full_name || item.user?.full_name || item.name || '';
      const bio = item.biography || item.user?.biography || item.bio || item.text || '';
      const followers = Number(item.follower_count || item.user?.follower_count || item.followers || 0);

      // Extract emails and public links
      const email = item.public_email || item.user?.public_email || extractEmail(bio);
      const phone = item.contact_phone_number || item.user?.contact_phone_number || undefined;
      const publicLinks = extractLinks(bio, item.bio_links || item.user?.bio_links || [item.external_url, item.external_lynx_url]);

      // Classify role
      const { category, matchedKeywords } = classifyProfile(bio, publicLinks);

      // Follower range filter
      if (followers > 0) {
        if (followers < minFollowers || followers > maxFollowers) {
          continue;
        }
      }

      // Contact required filter
      if (onlyWithContact && !email && publicLinks.length === 0) {
        continue;
      }

      // Role filter check
      const isArtist = category === 'Артист';
      const isProducer = category === 'Продюсер';
      const isEngineer = category === 'Звукорежиссёр';
      const isUncategorized = category === 'Не определён';

      const wantsArtist = roleFilters.includes('artist');
      const wantsProducer = roleFilters.includes('producer');
      const wantsEngineer = roleFilters.includes('engineer');

      let matchesRole = false;
      if (wantsArtist && isArtist) matchesRole = true;
      if (wantsProducer && isProducer) matchesRole = true;
      if (wantsEngineer && isEngineer) matchesRole = true;
      if (keepUncategorized && isUncategorized) matchesRole = true;

      if (!matchesRole) {
        continue;
      }

      leads.push({
        handle: `@${username.replace(/^@/, '')}`,
        profileUrl: `https://www.instagram.com/${username.replace(/^@/, '')}/`,
        category,
        fullName: fullName || username,
        bio: bio.trim(),
        followers,
        email,
        phone,
        publicLinks,
        dataStatus: 'AVAILABLE',
        categoryCheck: 'CHECKED',
        sourceType: sourceTypeLabel,
        matchedKeywords,
      });
    }

    return NextResponse.json({
      leads,
      totalScanned: rawItems.length,
      totalFiltered: leads.length,
      source: targetUsername,
    });
  } catch (error: any) {
    console.error('Error in /api/instagram-leads:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while scraping Instagram leads.' }, { status: 500 });
  }
}
