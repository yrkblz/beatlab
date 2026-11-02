import { NextResponse } from 'next/server';
import { InstagramSessionClient, sleep } from '@/lib/instagram-session-client';
import {
  extractShortcode,
  extractArtistsFromPost,
  extractArtistsFromChannelPosts,
} from '@/lib/instagram-post-extractor';
import {
  getScrapeState,
  saveScrapeState,
  getKnownScannedUsernames,
  recordScannedProfiles,
} from '@/lib/instagram-scraper-cache';

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

import {
  MUSIC_LINK_DOMAINS,
  BEAT_STORE_DOMAINS,
  isBeatStoreLink,
  isMusicLink,
  ARTIST_KEYWORDS,
  PRODUCER_KEYWORDS,
  ENGINEER_KEYWORDS,
  extractEmail,
  extractLinks,
  classifyProfile,
} from '@/lib/instagram-classifier';

export {
  MUSIC_LINK_DOMAINS,
  BEAT_STORE_DOMAINS,
  isBeatStoreLink,
  isMusicLink,
  ARTIST_KEYWORDS,
  PRODUCER_KEYWORDS,
  ENGINEER_KEYWORDS,
  extractEmail,
  extractLinks,
  classifyProfile,
};

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
      cursor: clientCursor,
      resetState = false,
      minFollowers = 100,
      maxFollowers = 200000,
      roleFilters = ['artist', 'producer'],
      onlyWithContact = false,
      keepUncategorized = false,
      apiKey: clientApiKey,
      apiHost: clientApiHost,
      customSessionId,
    } = body;

    if (!source || typeof source !== 'string' || !source.trim()) {
      return NextResponse.json({ error: 'Please enter a target Instagram profile, post URL or hashtag.' }, { status: 400 });
    }

    // Direct Post / Reel or Channel Performance Posts detection
    const postShortcode = extractShortcode(source);
    if (postShortcode || mode === 'post' || mode === 'posts') {
      try {
        const activeSession = (customSessionId || process.env.INSTAGRAM_SESSION_ID || '').trim();
        const client = activeSession ? new InstagramSessionClient({ sessionId: activeSession }) : undefined;
        const filterOnlyArtists = body.filterOnlyArtists !== false;
        let extractedLeads: any[] = [];
        if (postShortcode) {
          extractedLeads = await extractArtistsFromPost(postShortcode, client, { filterOnlyArtists });
        } else {
          extractedLeads = await extractArtistsFromChannelPosts(source, Number(limit) || 25, client, { filterOnlyArtists });
        }

        return NextResponse.json({
          leads: extractedLeads,
          totalScanned: extractedLeads.length,
          producersFoundCount: 0,
          artistsFoundCount: extractedLeads.length,
          isExhausted: true,
          nextCursor: null,
          source,
          mode: 'post_mentions',
        });
      } catch (err: any) {
        console.error('[InstagramLeads API] Post extraction error:', err);
      }
    }

    const sessionId = process.env.INSTAGRAM_SESSION_ID;
    const apifyToken = process.env.APIFY_TOKEN;
    const apiKey = clientApiKey || process.env.RAPIDAPI_KEY;

    if (!sessionId && !apifyToken && !apiKey) {
      return NextResponse.json({
        error: 'API key or Instagram session is missing. Please provide INSTAGRAM_SESSION_ID or RAPIDAPI_KEY in .env.local.',
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

    // 1. If custom Instagram session is configured, run our Target Yield Session Engine!
    if (sessionId) {
      console.log(`[Custom Instagram Engine] Running session engine for @${targetUsername} (${mode}, goal: ${parsedLimit})`);
      try {
        const client = new InstagramSessionClient({
          sessionId,
          dsUserId: process.env.INSTAGRAM_DS_USER_ID,
          csrfToken: process.env.INSTAGRAM_CSRF_TOKEN,
        });

        // Resolve target user numeric ID
        let targetId = /^\d+$/.test(targetUsername) ? targetUsername : '';
        if (!targetId) {
          targetId = (await client.resolveUserId(targetUsername)) || '';
        }

        if (!targetId) {
          const targetProfile = await client.fetchUserProfile(targetUsername);
          if (targetProfile && targetProfile.id && /^\d+$/.test(targetProfile.id)) {
            targetId = targetProfile.id;
          }
        }

        if (!targetId && apiKey) {
          const host = clientApiHost || process.env.INSTAGRAM_RAPIDAPI_HOST || 'instagram-scraper-20251.p.rapidapi.com';
          try {
            const res = await fetch(`https://${host}/userinfo/?username_or_id=${encodeURIComponent(targetUsername)}`, {
              headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host },
            });
            if (res.ok) {
              const d = await res.json();
              if (d?.data?.id) targetId = String(d.data.id);
            }
          } catch (e) {
            console.warn('[Custom Instagram Engine] Could not resolve ID via RapidAPI:', e);
          }
        }

        if (!targetId) {
          throw new Error(`Nie udało się ustalić ID numerycznego dla profilu @${targetUsername}.`);
        }

        const previousState = resetState ? null : await getScrapeState(targetUsername, mode);
        let cursor = clientCursor !== undefined ? clientCursor : previousState?.nextCursor;
        const knownScannedUsernames = await getKnownScannedUsernames(targetUsername);

        console.log(`[Custom Instagram Engine] Target ID: ${targetId}, Resuming from cursor: ${cursor || 'start'}, already known: ${knownScannedUsernames.size}`);

        const qualifiedLeads: InstagramLeadItem[] = [];
        const newlyScannedRecords: { username: string; isQualified: boolean; category?: string; data?: any }[] = [];
        let pagesScanned = 0;
        const startTime = Date.now();
        const maxDurationMs = 50000; // 50 seconds max per batch to prevent browser timeout
        const maxPages = 10; // safety ceiling (up to 500 accounts per batch)
        let totalCheckedThisRun = 0;
        let isExhausted = false;
        let producersFoundCount = 0;
        let artistsFoundCount = 0;

        while (
          qualifiedLeads.length < parsedLimit &&
          pagesScanned < maxPages &&
          Date.now() - startTime < maxDurationMs
        ) {
          pagesScanned++;
          const batch = mode === 'following'
            ? await client.fetchFollowingBatch(targetId, 50, cursor)
            : await client.fetchFollowersBatch(targetId, 50, cursor);

          if (!batch.users || batch.users.length === 0) {
            cursor = undefined;
            isExhausted = true;
            break;
          }

          cursor = batch.nextCursor;

          for (const candidate of batch.users) {
            // Check time budget
            if (Date.now() - startTime > maxDurationMs) break;

            const uName = candidate.username.toLowerCase();
            if (knownScannedUsernames.has(uName)) {
              continue;
            }

            knownScannedUsernames.add(uName);
            totalCheckedThisRun++;

            if (candidate.isPrivate) {
              newlyScannedRecords.push({
                username: candidate.username,
                isQualified: false,
                category: 'Не определён',
                data: { isPrivate: true },
              });
              continue;
            }

            // Respectful jitter delay between profile lookups to simulate natural human activity
            await sleep(650 + Math.floor(Math.random() * 450));

            const userDetail = await client.fetchUserProfile(candidate.username);
            if (!userDetail) continue;

            const wantsArtist = roleFilters.includes('artist');
            const wantsProducer = roleFilters.includes('producer');
            const wantsEngineer = roleFilters.includes('engineer');

            const { category, matchedKeywords, isProducer, isArtist, isEngineer, hasMusicLink } = classifyProfile(
              userDetail.biography,
              userDetail.bioLinks,
              userDetail.username,
              userDetail.fullName,
              { allowBeatStores: wantsProducer }
            );

            if (category === 'Продюсер') producersFoundCount++;
            if (category === 'Артист') artistsFoundCount++;

            const hasEmail = Boolean(userDetail.email);
            const hasPhone = Boolean(userDetail.phone);

            // A profile has valid contact info ONLY if it has an email, phone, or genuine music link (Spotify, Linktree, Apple Music, or BeatStars when searching producers)
            const hasContactInfo = hasEmail || hasPhone || hasMusicLink;
            const isQualified = hasContactInfo || !onlyWithContact;

            newlyScannedRecords.push({
              username: userDetail.username,
              isQualified,
              category,
              data: {
                bio: userDetail.biography,
                email: userDetail.email,
                phone: userDetail.phone,
                links: userDetail.bioLinks,
                followers: userDetail.followerCount,
              },
            });

            // 1. If onlyWithContact is enabled, require email, phone or Spotify/Linktree/Apple Music link (or BeatStars for producers)
            if (onlyWithContact && !hasContactInfo) {
              continue;
            }

            // 2. Follower count range filter
            if (userDetail.followerCount > 0) {
              if (userDetail.followerCount < minFollowers || userDetail.followerCount > maxFollowers) {
                continue;
              }
            }

            // 3. STRICT ROLE FILTERING:
            // "jesli np zrobimy tak ze ja zaznacze artystow tylko a system zrozumie ze to jest producent to poprstu nie wrzuca i idzie dalej"
            if (wantsArtist && !wantsProducer && isProducer) {
              continue; // Drop producers when user ONLY wants artists!
            }

            if (wantsProducer && !wantsArtist && isArtist && !isProducer) {
              continue; // Drop artists when user ONLY wants producers!
            }

            let matchesRole = false;
            if (roleFilters.length === 0) matchesRole = true;
            if (wantsArtist && isArtist) matchesRole = true;
            if (wantsProducer && isProducer) matchesRole = true;
            if (wantsEngineer && isEngineer) matchesRole = true;
            if (keepUncategorized && category === 'Не определён') matchesRole = true;

            if (!matchesRole) {
              continue;
            }

            const musicLinks = userDetail.bioLinks.filter((link) => isMusicLink(link, wantsProducer));
            const orderedLinks = musicLinks.length > 0
              ? Array.from(new Set([...musicLinks, ...userDetail.bioLinks]))
              : userDetail.bioLinks;

            qualifiedLeads.push({
              handle: `@${userDetail.username}`,
              profileUrl: `https://www.instagram.com/${userDetail.username}/`,
              category,
              fullName: userDetail.fullName || userDetail.username,
              bio: userDetail.biography.trim(),
              followers: userDetail.followerCount,
              email: userDetail.email,
              phone: userDetail.phone,
              publicLinks: orderedLinks,
              dataStatus: 'AVAILABLE',
              categoryCheck: 'CHECKED',
              sourceType: sourceTypeLabel,
              matchedKeywords,
            });

            if (qualifiedLeads.length >= parsedLimit) {
              break;
            }
          }

          if (!batch.hasMore || !cursor) {
            isExhausted = true;
            break;
          }
        }

        // Save progress to Supabase/cache
        await recordScannedProfiles(targetUsername, newlyScannedRecords);
        await saveScrapeState(
          targetUsername,
          mode,
          cursor,
          totalCheckedThisRun,
          qualifiedLeads.length
        );

        return NextResponse.json({
          leads: qualifiedLeads,
          totalScanned: totalCheckedThisRun,
          totalFiltered: qualifiedLeads.length,
          source: targetUsername,
          engine: 'INSTAGRAM_CUSTOM_SESSION_ENGINE',
          nextCursor: cursor || null,
          isExhausted,
          producersFoundCount,
          artistsFoundCount,
        });
      } catch (sessionErr: any) {
        console.error('[Custom Instagram Engine] Error:', sessionErr);
        if (!apiKey && !apifyToken) {
          return NextResponse.json({
            error: `Błąd silnika sesyjnego Instagrama: ${sessionErr.message}`,
            code: 'SESSION_ENGINE_ERROR'
          }, { status: 500 });
        }
        console.warn('[Custom Instagram Engine] Falling back to secondary scrapers...');
      }
    }

    let rawItems: any[] = [];
    let rapidRes: Response | null = null;
    let rapidData: any = null;

    if (apifyToken) {
      console.log(`[InstagramLeads API] Using Apify for ${mode} on @${targetUsername} (limit: ${parsedLimit})`);
      try {
        if (mode === 'followers' || mode === 'following') {
          // Use data-slayer enriched follower scraper which visits each follower's profile,
          // extracts bio, Spotify/Soundcloud/Linktree links, emails, and follower counts!
          const actorId = 'data-slayer~instagram-followers-scraper---no-login';
          // If onlyWithContact is selected, sample more pages so after filtering private accounts we get the requested leads
          const pageMultiplier = onlyWithContact ? 3 : 1;
          const maxPages = Math.min(6, Math.max(1, Math.ceil((parsedLimit * pageMultiplier) / 50)));
          const apifyRes = await fetch(
            `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=180`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: targetUsername,
                maxPages: maxPages,
                mode: 'enriched',
              }),
            }
          );

          if (!apifyRes.ok) {
            const errJson = await apifyRes.json().catch(() => null);
            throw new Error(errJson?.error?.message || `Apify status ${apifyRes.status}`);
          }

          const apifyData = await apifyRes.json();
          rawItems = Array.isArray(apifyData) ? apifyData : [];
          console.log(`[InstagramLeads API] Apify enriched items returned: ${rawItems.length}`);
        } else {
          const apifyRes = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=60`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usernames: [targetUsername],
              }),
            }
          );

          if (apifyRes.ok) {
            const apifyData = await apifyRes.json();
            rawItems = Array.isArray(apifyData) ? apifyData : [];
          }
        }
      } catch (apifyErr: any) {
        console.warn('[InstagramLeads API] Apify failed or exceeded monthly limit:', apifyErr.message);
        if (!apiKey) {
          const isHardLimit = apifyErr.message?.includes('Monthly usage hard limit exceeded') || apifyErr.message?.includes('usage');
          return NextResponse.json({
            error: isHardLimit
              ? 'Wyczerpano darmowy limit $5 na koncie Apify (Monthly usage hard limit exceeded). Zaloguj się na console.apify.com, aby doładować konto lub utwórz nowe darmowe konto na apify.com i zaktualizuj APIFY_TOKEN.'
              : `Błąd Apify: ${apifyErr.message}`,
            code: isHardLimit ? 'APIFY_HARD_LIMIT_EXCEEDED' : 'APIFY_ERROR'
          }, { status: 500 });
        }
        console.log('[InstagramLeads API] Falling back to RapidAPI...');
      }
    }

    if (rawItems.length === 0 && apiKey) {
      // Support both Instagram Scraper Stable API (RockSolid APIs) and Instagram Scraper 2025 / API2
      const rapidApiHost = clientApiHost || process.env.INSTAGRAM_RAPIDAPI_HOST || 'instagram-scraper-stable-api.p.rapidapi.com';

      if (rapidApiHost.includes('stable') || rapidApiHost.includes('rocksolid')) {
        const dataMode = mode === 'following' ? 'following' : 'followers';
        const formBody = new URLSearchParams();
        formBody.append('username_or_url', targetUsername);
        formBody.append('username', targetUsername);
        formBody.append('data', dataMode);
        formBody.append('amount', String(parsedLimit));
        formBody.append('start_from', '0');
        formBody.append('pagination_token', '');

        let endpointPath = '/get_ig_user_followers.php';
        if (mode === 'following') {
          endpointPath = '/get_ig_user_following.php';
        } else if (mode === 'comments') {
          endpointPath = '/get_ig_user_posts.php';
        } else if (mode === 'hashtag') {
          endpointPath = '/get_ig_user_followers.php';
        }

        console.log('[InstagramLeads API] Requesting:', `https://${rapidApiHost}${endpointPath}`, formBody.toString());

        rapidRes = await fetch(`https://${rapidApiHost}${endpointPath}`, {
          method: 'POST',
          headers: {
            'x-rapidapi-key': apiKey!,
            'x-rapidapi-host': rapidApiHost,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody.toString(),
        });
        rapidData = await rapidRes.json();
        console.log('[InstagramLeads API] Primary response:', rapidRes.status, JSON.stringify(rapidData));

        // If followers mode returns "try again later" or non-ok, attempt v2 fallback
        if (
          mode === 'followers' &&
          (rapidData?.error || !rapidRes.ok)
        ) {
          try {
            console.log('[InstagramLeads API] Attempting v2 fallback...');
            const fallbackRes = await fetch(`https://${rapidApiHost}/get_ig_user_followers_v2.php`, {
              method: 'POST',
              headers: {
                'x-rapidapi-key': apiKey!,
                'x-rapidapi-host': rapidApiHost,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formBody.toString(),
            });
            const fallbackData = await fallbackRes.json();
            console.log('[InstagramLeads API] Fallback response:', fallbackRes.status, JSON.stringify(fallbackData));
            if (fallbackRes.ok && !fallbackData?.error) {
              rapidRes = fallbackRes;
              rapidData = fallbackData;
            }
          } catch (fbErr) {
            console.error('[InstagramLeads API] Fallback error:', fbErr);
          }
        }
      } else {
        let endpointUrl = '';
        if (rapidApiHost.includes('2025')) {
          let lookupId = targetUsername;
          // Resolve numeric ID for userfollowers/userfollowing if needed
          if (mode === 'followers' || mode === 'following') {
            try {
              const infoRes = await fetch(`https://${rapidApiHost}/userinfo/?username_or_id=${encodeURIComponent(targetUsername)}`, {
                headers: {
                  'x-rapidapi-key': apiKey!,
                  'x-rapidapi-host': rapidApiHost,
                },
              });
              if (infoRes.ok) {
                const infoData = await infoRes.json();
                if (infoData?.data?.id) {
                  lookupId = String(infoData.data.id);
                }
                if (infoData?.data?.username) {
                  rawItems.push(infoData.data);
                }
              }
            } catch (resolveErr) {
              console.warn('[InstagramLeads API] Could not resolve numeric ID for user:', resolveErr);
            }
          }

          if (mode === 'following') {
            endpointUrl = `https://${rapidApiHost}/userfollowing/?username_or_id=${encodeURIComponent(lookupId)}`;
          } else if (mode === 'hashtag' || source.trim().startsWith('#')) {
            endpointUrl = `https://${rapidApiHost}/searchuser/?keyword=${encodeURIComponent(targetUsername)}`;
          } else if (mode === 'comments') {
            endpointUrl = `https://${rapidApiHost}/postcomments/?shortcode=${encodeURIComponent(source)}`;
          } else {
            // Default: followers
            endpointUrl = `https://${rapidApiHost}/userfollowers/?username_or_id=${encodeURIComponent(lookupId)}`;
          }
        } else if (rapidApiHost.includes('public-bulk-scraper')) {
          if (mode === 'hashtag' || source.trim().startsWith('#')) {
            endpointUrl = `https://${rapidApiHost}/v1/search_users?query=${encodeURIComponent(targetUsername)}`;
          } else {
            endpointUrl = `https://${rapidApiHost}/v1/user_info?username_or_id=${encodeURIComponent(targetUsername)}&username=${encodeURIComponent(targetUsername)}`;
          }
        } else if (mode === 'followers') {
          endpointUrl = `https://${rapidApiHost}/v1/followers?username_or_id_or_url=${encodeURIComponent(targetUsername)}&amount=${parsedLimit}`;
        } else if (mode === 'following') {
          endpointUrl = `https://${rapidApiHost}/v1/following?username_or_id_or_url=${encodeURIComponent(targetUsername)}&amount=${parsedLimit}`;
        } else if (mode === 'comments') {
          endpointUrl = `https://${rapidApiHost}/v1/comments?code_or_id_or_url=${encodeURIComponent(source)}&amount=${parsedLimit}`;
        } else {
          endpointUrl = `https://${rapidApiHost}/v1/hashtag?hashtag=${encodeURIComponent(targetUsername)}&amount=${parsedLimit}`;
        }

        console.log('[InstagramLeads API] Requesting GET:', endpointUrl);
        rapidRes = await fetch(endpointUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey!,
            'x-rapidapi-host': rapidApiHost,
            'x-api-key': apiKey!,
            'x-api-host': rapidApiHost,
          },
        });
        rapidData = await rapidRes.json();
        console.log('[InstagramLeads API] Response status:', rapidRes.status, 'Response data:', JSON.stringify(rapidData));
      }

      if (rapidRes && !rapidRes.ok) {
        if (rapidRes.status === 429) {
          return NextResponse.json({
            error: 'Wyczerpano darmowy miesięczny limit zapytań na RapidAPI. Aby zbierać więcej profili, zwiększ plan na RapidAPI lub użyj innego darmowego konta.',
            code: 'RATE_LIMIT_EXCEEDED'
          }, { status: 429 });
        }
        const errorMsg = rapidData?.message || rapidData?.error || `RapidAPI error status ${rapidRes.status}`;
        return NextResponse.json({ error: errorMsg }, { status: rapidRes.status });
      }

      if (rapidData?.status === 'error' || rapidData?.error) {
        const errMsg = rapidData?.message || rapidData?.error || 'Wystąpił błąd podczas pobierania danych z Instagram API.';
        if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('try again later')) {
          return NextResponse.json({
            error: 'Instagram chwilowo zablokował odczyt listy dla tego konkretnego profilu (ochrona anty-bot Instagrama). Twój darmowy limit NIE został potrącony. Spróbuj za chwilę z innym profilem lub odczekaj moment.',
            code: 'UPSTREAM_TEMPORARY_BLOCK'
          }, { status: 400 });
        }
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    // Extract profiles list from RapidAPI response structure
    const rapidItems: any[] = [];
    if (rapidData) {
      if (rapidData?.data && typeof rapidData.data === 'object' && !Array.isArray(rapidData.data) && rapidData.data.username) {
        // Single profile response (e.g. from /v1/user_info or /userinfo/)
        rapidItems.push(rapidData.data);

        const seenUsernames = new Set<string>([rapidData.data.username.toLowerCase()]);

        // Add tagged collaborators / performers from both timeline posts and videos/reels
        const timelineEdges = rapidData.data.edge_owner_to_timeline_media?.edges || [];
        const videoEdges = rapidData.data.edge_felix_video_timeline?.edges || [];
        const mediaEdges = [...timelineEdges, ...videoEdges];

        for (const edge of mediaEdges) {
          const taggedUsers = edge.node?.edge_media_to_tagged_user?.edges || [];
          for (const t of taggedUsers) {
            const u = t.node?.user;
            if (u?.username && !seenUsernames.has(u.username.toLowerCase())) {
              seenUsernames.add(u.username.toLowerCase());
              rapidItems.push({
                username: u.username,
                full_name: u.full_name || u.username,
                biography: `Występuje / oznaczony w postach @${rapidData.data.username}`,
                follower_count: 0,
              });
            }
          }
        }

        // Add bio entity mentions
        const bioEntities = rapidData.data.biography_with_entities?.entities || [];
        for (const ent of bioEntities) {
          const uName = ent.user?.username;
          if (uName && !seenUsernames.has(uName.toLowerCase())) {
            seenUsernames.add(uName.toLowerCase());
            rapidItems.push({
              username: uName,
              full_name: uName,
              biography: `Współpracownik oznaczony w bio @${rapidData.data.username}`,
              follower_count: 0,
            });
          }
        }
      } else if (Array.isArray(rapidData?.data?.items)) {
        rapidItems.push(...rapidData.data.items);
      } else if (Array.isArray(rapidData?.data?.users)) {
        rapidItems.push(...rapidData.data.users);
      } else if (Array.isArray(rapidData?.data?.results)) {
        rapidItems.push(...rapidData.data.results);
      } else if (Array.isArray(rapidData?.data?.search_results)) {
        rapidItems.push(...rapidData.data.search_results);
      } else if (Array.isArray(rapidData?.data?.edges)) {
        rapidItems.push(...rapidData.data.edges.map((e: any) => e.node || e));
      } else if (Array.isArray(rapidData?.data)) {
        rapidItems.push(...rapidData.data);
      } else if (Array.isArray(rapidData?.users)) {
        rapidItems.push(...rapidData.users);
      } else if (Array.isArray(rapidData?.items)) {
        rapidItems.push(...rapidData.items);
      } else if (Array.isArray(rapidData?.results)) {
        rapidItems.push(...rapidData.results);
      } else if (Array.isArray(rapidData?.followers)) {
        rapidItems.push(...rapidData.followers);
      } else if (Array.isArray(rapidData?.edges)) {
        rapidItems.push(...rapidData.edges.map((e: any) => e.node || e));
      } else if (Array.isArray(rapidData)) {
        rapidItems.push(...rapidData);
      }
    }

    // Combine and deduplicate rawItems by username
    const allCombined = [...rawItems, ...rapidItems];
    const uniqueUserMap = new Map<string, any>();
    for (const item of allCombined) {
      const u = item.username || item.user?.username || item.owner?.username || item.node?.username || item.node?.user?.username;
      if (u) {
        const lower = u.toLowerCase();
        if (!uniqueUserMap.has(lower) || (item.biography && !uniqueUserMap.get(lower)?.biography)) {
          uniqueUserMap.set(lower, item);
        }
      }
    }
    rawItems = Array.from(uniqueUserMap.values());

    if (rawItems.length === 0) {
      return NextResponse.json({
        leads: [],
        message: 'No profiles found for this source or limit reached.',
      });
    }

    // Transform and classify profiles
    const leads: InstagramLeadItem[] = [];

    for (const item of rawItems) {
      const username = item.username || item.user?.username || item.owner?.username || item.node?.username || item.node?.user?.username;
      if (!username) continue;

      const fullName = item.full_name || item.fullName || item.user?.full_name || item.node?.full_name || item.name || '';
      const bio = item.biography || item.bio || item.user?.biography || item.node?.biography || item.text || '';
      const followers = Number(item.follower_count || item.followersCount || item.user?.follower_count || item.followers || item.edge_followed_by?.count || 0);

      // Extract emails and public links
      const email = item.public_email || item.biography_email || item.email || item.user?.public_email || extractEmail(bio) || extractEmail(fullName);
      const phone = item.contact_phone_number || item.public_phone_number || item.phone || item.user?.contact_phone_number || undefined;
      const combinedLinks = [
        ...(Array.isArray(item.bio_links) ? item.bio_links : []),
        item.external_url,
        ...(Array.isArray(item.externalUrls) ? item.externalUrls : []),
        ...(Array.isArray(item.user?.bio_links) ? item.user.bio_links : []),
        item.external_lynx_url,
      ].filter(Boolean);
      const publicLinks = extractLinks(bio, combinedLinks);

      const wantsArtist = roleFilters.includes('artist');
      const wantsProducer = roleFilters.includes('producer');
      const wantsEngineer = roleFilters.includes('engineer');

      // Classify role
      let { category, matchedKeywords, isProducer, isArtist, isEngineer, hasMusicLink } = classifyProfile(
        bio,
        publicLinks,
        username,
        fullName,
        { allowBeatStores: wantsProducer }
      );
      if (category === 'Не определён' && (item.biography?.includes('Występuje / oznaczony w postach') || item.biography?.includes('Współpracownik oznaczony'))) {
        category = 'Артист';
        matchedKeywords = ['featured artist'];
      }

      const isDirectTarget = username.toLowerCase() === targetUsername.toLowerCase();

      // Follower range filter
      if (followers > 0 && !isDirectTarget) {
        if (followers < minFollowers || followers > maxFollowers) {
          continue;
        }
      }

      const musicLinks = publicLinks.filter((link: string) => isMusicLink(link, wantsProducer));
      const hasValidMusicLink = musicLinks.length > 0;
      const hasContactInfo = Boolean(email) || Boolean(phone) || hasValidMusicLink;

      // Contact required filter: must have email/phone or genuine music link (Spotify/Apple Music/Linktree or BeatStars for producers)
      if (onlyWithContact && !hasContactInfo && !isDirectTarget) {
        continue;
      }

      // Role filter check
      const isUncategorized = category === 'Не определён';

      if (wantsArtist && !wantsProducer && isProducer && !isDirectTarget) {
        continue;
      }
      if (wantsProducer && !wantsArtist && isArtist && !isProducer && !isDirectTarget) {
        continue;
      }

      let matchesRole = false;
      if (roleFilters.length === 0) matchesRole = true;
      if (wantsArtist && isArtist) matchesRole = true;
      if (wantsProducer && isProducer) matchesRole = true;
      if (wantsEngineer && isEngineer) matchesRole = true;
      if (keepUncategorized && isUncategorized) matchesRole = true;
      if (isDirectTarget) matchesRole = true;

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
