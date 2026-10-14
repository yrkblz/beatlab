import { NextResponse } from 'next/server';

// Function extracting Instagram handle or link from text
function extractInstagram(description: string): string | null {
  if (!description) return null;

  // Search for instagram.com/username links
  const linkMatch = description.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/i);
  if (linkMatch && !['p', 'reel', 'stories', 'explore', 'channel'].includes(linkMatch[1].toLowerCase())) {
    return linkMatch[1];
  }

  // Search for patterns like "IG: name", "Insta: @name", "ig - @name", "@name on ig"
  const textMatch = description.match(/(?:ig|insta|instagram)[\s]*[:-]*[\s]*@?([a-zA-Z0-9_.-]{3,30})/i);
  if (textMatch && textMatch[1].length > 2) return textMatch[1];

  return null;
}

// Function extracting business / inquiry email from text (e.g. "WSPÓŁPRACA: nahapsa@igie.gg")
function extractEmail(description: string): string | null {
  if (!description) return null;
  const match = description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (match) {
    const email = match[0].trim();
    const lower = email.toLowerCase();
    // Exclude file extensions or common library placeholders
    if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.gif') && !lower.endsWith('.webp')) {
      return email;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const {
      query,
      maxResults = 25,
      pageToken,
      excludeHandles = [],
      excludeChannels = [],
    } = await request.json();

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing YOUTUBE_API_KEY in server configuration.' }, { status: 500 });
    }

    if (!query) {
      return NextResponse.json({ error: 'Missing query tag.' }, { status: 400 });
    }

    const requestedCount = Math.min(Math.max(1, Number(maxResults) || 50), 100);
    const excludeIgSet = new Set(
      (excludeHandles || []).map((h: string) => (h || '').toLowerCase().trim())
    );
    const excludeChSet = new Set(
      (excludeChannels || []).map((c: string) => (c || '').toLowerCase().trim())
    );

    let currentPageToken = pageToken || '';
    let totalVideosScanned = 0;
    let nextTokenToReturn: string | null = null;
    const leads: any[] = [];

    // If searching unique leads, allow scanning deeper (up to 3 pages) until fresh unique leads are found
    const maxPages = requestedCount > 50 ? 2 : excludeIgSet.size > 0 ? 3 : 1;
    let pagesFetched = 0;

    while (pagesFetched < maxPages && totalVideosScanned < requestedCount) {
      pagesFetched++;
      const pageSize = Math.min(50, requestedCount - totalVideosScanned);
      const pageParam = currentPageToken ? `&pageToken=${encodeURIComponent(currentPageToken)}` : '';

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(
        query
      )}&type=video&maxResults=${pageSize}&order=date${pageParam}&key=${apiKey}`;

      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) {
        if (pagesFetched > 1) {
          // If subsequent page failed, return leads accumulated so far
          break;
        }
        const err = await searchRes.json().catch(() => ({}));
        throw new Error(err.error?.message || 'YouTube search error');
      }

      const searchData = await searchRes.json();
      nextTokenToReturn = searchData.nextPageToken || null;
      currentPageToken = searchData.nextPageToken || '';

      const items = searchData.items || [];
      const videoIds = items.map((i: any) => i.id?.videoId).filter(Boolean);
      totalVideosScanned += videoIds.length;

      if (videoIds.length === 0) {
        break;
      }

      // Fetch complete descriptions in chunks of 50
      for (let i = 0; i < videoIds.length; i += 50) {
        const chunk = videoIds.slice(i, i + 50).join(',');
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${chunk}&key=${apiKey}`
        );
        if (!videosRes.ok) continue;
        const videosData = await videosRes.json();

        // Collect unique channel IDs to inspect their Channel "About" descriptions
        const channelIds = Array.from(
          new Set(
            (videosData.items || [])
              .map((v: any) => v.snippet?.channelId)
              .filter(Boolean)
          )
        );

        const channelMap: Record<string, { description: string; customUrl: string }> = {};
        if (channelIds.length > 0) {
          try {
            const channelsRes = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(',')}&key=${apiKey}`
            );
            if (channelsRes.ok) {
              const channelsData = await channelsRes.json();
              (channelsData.items || []).forEach((c: any) => {
                if (c.id) {
                  channelMap[c.id] = {
                    description: c.snippet?.description || '',
                    customUrl: c.snippet?.customUrl || '',
                  };
                }
              });
            }
          } catch {
            // Graceful non-fatal fallback
          }
        }

        (videosData.items || []).forEach((video: any) => {
          const channelName = video.snippet?.channelTitle || 'Unknown Artist';
          const channelId = video.snippet?.channelId;
          const channelInfo = channelId ? channelMap[channelId] : null;

          const videoDesc = video.snippet?.description || '';
          const channelDesc = channelInfo?.description || '';
          const videoTitle = video.snippet?.title || 'YouTube Video';
          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

          // Check video description first, fallback to Channel "About" description
          const instagram = extractInstagram(videoDesc) || extractInstagram(channelDesc);

          // Check Channel "About" description for email (e.g. WSPÓŁPRACA: nahapsa@igie.gg), then video description
          const email = extractEmail(channelDesc) || extractEmail(videoDesc);

          // Only keep lead if we found an Instagram OR an Email
          if (!instagram && !email) return;

          const igLower = (instagram || '').toLowerCase().trim();
          const chLower = channelName.toLowerCase().trim();
          const emailLower = (email || '').toLowerCase().trim();

          // Skip if in exclude list (already seen in past searches)
          if (
            (igLower && excludeIgSet.has(igLower)) ||
            (chLower && excludeChSet.has(chLower)) ||
            (emailLower && excludeIgSet.has(emailLower))
          ) {
            return;
          }

          // Skip if already in this batch
          if (
            leads.some(
              (l) =>
                (chLower && l.channelName.toLowerCase() === chLower) ||
                (igLower && l.instagram && l.instagram.toLowerCase() === igLower) ||
                (emailLower && l.email && l.email.toLowerCase() === emailLower)
            )
          ) {
            return;
          }

          leads.push({
            channelName,
            channelId,
            channelCustomUrl: channelInfo?.customUrl || '',
            instagram: instagram || '',
            email: email || '',
            videoTitle,
            videoUrl,
          });
        });
      }

      // If no more pages on YouTube, stop
      if (!currentPageToken) {
        break;
      }

      // If we are looking for unique leads and already found enough, stop early
      if (excludeIgSet.size > 0 && leads.length >= requestedCount / 2) {
        break;
      }
    }

    return NextResponse.json({
      leads,
      nextPageToken: nextTokenToReturn,
      totalScanned: totalVideosScanned,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
