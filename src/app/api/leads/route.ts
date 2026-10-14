import { NextResponse } from 'next/server';

// Function extracting Instagram handle or link from video description
function extractInstagram(description: string): string | null {
  if (!description) return null;
  
  // Search for instagram.com/username links
  const linkMatch = description.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/i);
  if (linkMatch) return linkMatch[1];

  // Search for patterns like "IG: name", "Insta: @name", "ig - @name"
  const textMatch = description.match(/(?:ig|insta|instagram)[\s]*[:-]*[\s]*@?([a-zA-Z0-9_.-]+)/i);
  if (textMatch && textMatch[1].length > 2) return textMatch[1];

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

        (videosData.items || []).forEach((video: any) => {
          const channelName = video.snippet?.channelTitle || 'Unknown Artist';
          const description = video.snippet?.description || '';
          const videoTitle = video.snippet?.title || 'YouTube Video';
          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

          const instagram = extractInstagram(description);

          if (!instagram) return;

          const igLower = instagram.toLowerCase().trim();
          const chLower = channelName.toLowerCase().trim();

          // Skip if in exclude list (already seen in past searches)
          if (excludeIgSet.has(igLower) || excludeChSet.has(chLower)) {
            return;
          }

          // Skip if already in this batch
          if (
            leads.some(
              (l) =>
                l.channelName.toLowerCase() === chLower ||
                l.instagram.toLowerCase() === igLower
            )
          ) {
            return;
          }

          leads.push({
            channelName,
            instagram,
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
