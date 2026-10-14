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
    const { query, maxResults = 25 } = await request.json();
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing YOUTUBE_API_KEY in server configuration.' }, { status: 500 });
    }

    if (!query) {
      return NextResponse.json({ error: 'Missing query tag.' }, { status: 400 });
    }

    const requestedCount = Math.min(Math.max(1, Number(maxResults) || 50), 100);
    const firstPageLimit = Math.min(requestedCount, 50);

    // 1. Search videos by given tag
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${firstPageLimit}&order=date&key=${apiKey}`
    );
    
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'YouTube search error');
    }
    
    const searchData = await searchRes.json();
    let videoIdList: string[] = (searchData.items || [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    // If requested more than 50 and there is a nextPageToken, fetch second page
    if (requestedCount > 50 && searchData.nextPageToken) {
      const secondPageLimit = requestedCount - 50;
      const searchRes2 = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${secondPageLimit}&pageToken=${searchData.nextPageToken}&order=date&key=${apiKey}`
      );
      if (searchRes2.ok) {
        const data2 = await searchRes2.json();
        const moreIds = (data2.items || [])
          .map((item: any) => item.id?.videoId)
          .filter(Boolean);
        videoIdList = [...videoIdList, ...moreIds];
      }
    }

    if (videoIdList.length === 0) {
      return NextResponse.json({ leads: [] });
    }

    // 2. Fetch complete descriptions for these videos in chunks of 50
    const leads: any[] = [];
    const chunkSize = 50;

    for (let i = 0; i < videoIdList.length; i += chunkSize) {
      const chunkIds = videoIdList.slice(i, i + chunkSize).join(',');
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${chunkIds}&key=${apiKey}`
      );
      if (!videosRes.ok) continue;
      const videosData = await videosRes.json();

      (videosData.items || []).forEach((video: any) => {
        const channelName = video.snippet?.channelTitle || 'Unknown Artist';
        const description = video.snippet?.description || '';
        const videoTitle = video.snippet?.title || 'YouTube Video';
        const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
        
        const instagram = extractInstagram(description);

        // Add only if Instagram was found and channel/handle is not already present in list
        if (
          instagram &&
          !leads.some(
            (l) =>
              l.channelName.toLowerCase() === channelName.toLowerCase() ||
              l.instagram.toLowerCase() === instagram.toLowerCase()
          )
        ) {
          leads.push({
            channelName,
            instagram,
            videoTitle,
            videoUrl,
          });
        }
      });
    }

    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
