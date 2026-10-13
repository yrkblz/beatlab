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

    // 1. Search videos by given tag
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=date&key=${apiKey}`
    );
    
    if (!searchRes.ok) {
      const err = await searchRes.json();
      throw new Error(err.error?.message || 'YouTube search error');
    }
    
    const searchData = await searchRes.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    if (!videoIds) {
      return NextResponse.json({ leads: [] });
    }

    // 2. Fetch complete descriptions for these videos
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${apiKey}`
    );
    const videosData = await videosRes.json();

    const leads: any[] = [];

    // 3. Analyze descriptions for Instagram links
    videosData.items.forEach((video: any) => {
      const channelName = video.snippet.channelTitle;
      const description = video.snippet.description;
      const videoTitle = video.snippet.title;
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      
      const instagram = extractInstagram(description);

      // Add only if Instagram was found and channel is not already present in list
      if (instagram && !leads.some(l => l.channelName === channelName)) {
        leads.push({
          channelName,
          instagram,
          videoTitle,
          videoUrl
        });
      }
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
