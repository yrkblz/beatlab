// Instagram Lead Classification & Music Link Validation

// General streaming & music release platforms (for Rappers & Artists)
export const MUSIC_LINK_DOMAINS = [
  'spotify',
  'spoti.fi',
  'apple.com',
  'apple.co',
  'linktr.ee',
  'soundcloud',
  'lnk.to',
  'unitedmasters',
  'ffm.to',
  'distrokid',
  'bandcamp',
  'audiomack',
  'tidal.com',
  'songwhip',
  'hypeddit',
  'fanlink',
  'youtube.com/watch',
  'youtu.be',
];

// Beat selling store platforms (accepted ONLY when Producers is selected)
export const BEAT_STORE_DOMAINS = [
  'beatstars',
  'bsta.rs',
  'airbit',
  'traktrain',
  'soundee',
];

export function isBeatStoreLink(url: string): boolean {
  if (!url) return false;
  const l = url.toLowerCase();
  return BEAT_STORE_DOMAINS.some((domain) => l.includes(domain));
}

export function isMusicLink(url: string, allowBeatStores: boolean = false): boolean {
  if (!url) return false;
  const l = url.toLowerCase();
  const isGeneralMusic = MUSIC_LINK_DOMAINS.some((domain) => l.includes(domain));
  if (isGeneralMusic) return true;
  if (allowBeatStores && isBeatStoreLink(l)) {
    return true;
  }
  return false;
}

export function detectMusicPlatforms(links: string[] = [], bio: string = ''): string[] {
  const platforms = new Set<string>();
  const combined = (links.join(' ') + ' ' + bio).toLowerCase();
  if (combined.includes('spotify') || combined.includes('spoti.fi')) platforms.add('Spotify');
  if (combined.includes('apple.com') || combined.includes('apple music') || combined.includes('music.apple')) platforms.add('Apple Music');
  if (combined.includes('soundcloud')) platforms.add('SoundCloud');
  if (combined.includes('youtube') || combined.includes('youtu.be')) platforms.add('YouTube');
  if (combined.includes('audiomack')) platforms.add('Audiomack');
  if (combined.includes('tidal')) platforms.add('Tidal');
  if (
    combined.includes('linktr.ee') ||
    combined.includes('lnk.to') ||
    combined.includes('unitedmasters') ||
    combined.includes('distrokid') ||
    combined.includes('ffm.to') ||
    combined.includes('songwhip') ||
    combined.includes('hypeddit')
  ) {
    platforms.add('Smartlink');
  }
  return Array.from(platforms);
}

export const ARTIST_KEYWORDS = [
  'rapper',
  'artist',
  'mc',
  'singer',
  'vocalist',
  'musician',
  'songwriter',
  'recording artist',
  'hip hop artist',
  'rap artist',
  'drill artist',
  'trap artist',
  'single out',
  'new single',
  'album out',
  'debut album',
  'ep out',
  'presave',
  'pre-save',
  'stream my single',
  'music video out',
];

export const PRODUCER_KEYWORDS = [
  'producer',
  'prod by',
  'prod.',
  'prodby',
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
  'cookup',
  'beatstars',
  'bsta.rs',
  'airbit',
  'traktrain',
  'soundee',
];

export const ENGINEER_KEYWORDS = [
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
  const normalized = text.normalize('NFKD');
  const match = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  return match ? match[0].toLowerCase() : undefined;
}

export function extractLinks(bio: string, rawLinks?: any[]): string[] {
  const linksSet = new Set<string>();

  if (rawLinks && Array.isArray(rawLinks)) {
    for (const l of rawLinks) {
      if (!l) continue;
      if (typeof l === 'string' && l.startsWith('http')) linksSet.add(l);
      else if (l?.url && typeof l.url === 'string') linksSet.add(l.url);
      else if (l?.link && typeof l.link === 'string') linksSet.add(l.link);
      else if (l?.lynx_url && typeof l.lynx_url === 'string') linksSet.add(l.lynx_url);
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

export function classifyProfile(
  bio: string,
  links: string[],
  username: string = '',
  fullName: string = '',
  options: { allowBeatStores?: boolean } = {}
): {
  category: 'Артист' | 'Продюсер' | 'Звукорежиссёр' | 'Не определён';
  matchedKeywords: string[];
  isProducer: boolean;
  isArtist: boolean;
  isEngineer: boolean;
  hasMusicLink: boolean;
  hasBeatStoreLink: boolean;
} {
  const bioLower = bio.toLowerCase();
  const nameLower = `${username} ${fullName}`.toLowerCase();
  const textToScan = `${nameLower} ${bioLower}`;
  const allLinksText = links.join(' ').toLowerCase();

  // Check if profile has a BeatStars or beat marketplace store link/mention
  const hasBeatStoreLink =
    links.some(isBeatStoreLink) ||
    BEAT_STORE_DOMAINS.some((domain) => textToScan.includes(domain) || allLinksText.includes(domain));

  // Check if profile has a genuine music release link (Spotify, Apple Music, Linktree, Soundcloud, etc.)
  const hasMusicReleaseLink =
    MUSIC_LINK_DOMAINS.some((domain) => allLinksText.includes(domain)) ||
    bioLower.includes('spotify') ||
    bioLower.includes('apple music') ||
    bioLower.includes('soundcloud') ||
    bioLower.includes('linktr.ee') ||
    bioLower.includes('lnk.to') ||
    bioLower.includes('unitedmasters') ||
    bioLower.includes('distrokid');

  // BeatStars is accepted as a qualifying music link ONLY when allowBeatStores is true (e.g. searching for producers)
  const hasMusicLink = hasMusicReleaseLink || (Boolean(options.allowBeatStores) && hasBeatStoreLink);

  // 1. Check Producer keywords
  const matchedProducerKw: string[] = [];
  for (const kw of PRODUCER_KEYWORDS) {
    if (textToScan.includes(kw)) {
      matchedProducerKw.push(kw);
    }
  }
  if (hasBeatStoreLink && !matchedProducerKw.some((k) => k.includes('beatstars') || k.includes('bsta.rs'))) {
    matchedProducerKw.push('beatstars');
  }

  // 2. Check Artist keywords
  const matchedArtistKw: string[] = [];
  for (const kw of ARTIST_KEYWORDS) {
    if (textToScan.includes(kw)) {
      matchedArtistKw.push(kw);
    }
  }

  // 3. Check Engineer keywords
  const matchedEngineerKw: string[] = [];
  for (const kw of ENGINEER_KEYWORDS) {
    if (textToScan.includes(kw)) {
      matchedEngineerKw.push(kw);
    }
  }

  const isProducer = matchedProducerKw.length > 0 || hasBeatStoreLink;
  const isEngineer = matchedEngineerKw.length > 0;
  // A profile selling beats on BeatStars is a producer, NOT an artist
  const isArtist = matchedArtistKw.length > 0 && !hasBeatStoreLink
    ? true
    : (hasMusicReleaseLink && !isProducer && !isEngineer);

  // If clearly a producer (e.g. "BR Producer & Engineer", "prod by", "beats", or beat store link):
  if (isProducer) {
    return {
      category: 'Продюсер',
      matchedKeywords: matchedProducerKw,
      isProducer: true,
      isArtist: matchedArtistKw.length > 0 && !hasBeatStoreLink,
      isEngineer,
      hasMusicLink,
      hasBeatStoreLink,
    };
  }

  if (isArtist) {
    return {
      category: 'Артист',
      matchedKeywords: matchedArtistKw.length > 0 ? matchedArtistKw : (hasMusicReleaseLink ? ['music link'] : []),
      isProducer: false,
      isArtist: true,
      isEngineer,
      hasMusicLink,
      hasBeatStoreLink: false,
    };
  }

  if (isEngineer) {
    return {
      category: 'Звукорежиссёр',
      matchedKeywords: matchedEngineerKw,
      isProducer: false,
      isArtist: false,
      isEngineer: true,
      hasMusicLink,
      hasBeatStoreLink: false,
    };
  }

  return {
    category: 'Не определён',
    matchedKeywords: [],
    isProducer: false,
    isArtist: false,
    isEngineer: false,
    hasMusicLink,
    hasBeatStoreLink: false,
  };
}
