import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('youtu')) {
      return NextResponse.json({ error: 'Please provide a valid YouTube URL' }, { status: 400 });
    }

    let rapidApiKey = process.env.RAPIDAPI_KEY;
    let rapidApiHost = process.env.RAPIDAPI_HOST;

    if (!rapidApiKey || !rapidApiHost) {
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const keyMatch = envContent.match(/RAPIDAPI_KEY=([^\r\n]+)/);
          const hostMatch = envContent.match(/RAPIDAPI_HOST=([^\r\n]+)/);
          if (keyMatch && keyMatch[1]) rapidApiKey = keyMatch[1].trim();
          if (hostMatch && hostMatch[1]) rapidApiHost = hostMatch[1].trim();
        }
      } catch (e) {
        console.error('Error reading .env.local manually:', e);
      }
    }

    if (!rapidApiKey || !rapidApiHost) {
      return NextResponse.json({ error: 'RapidAPI keys are not configured in .env.local yet.' }, { status: 500 });
    }

    // Extract Video ID
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    // Call RapidAPI (using a generic endpoint format, assuming user uses a common youtube-mp3 api like 'youtube-mp36.p.rapidapi.com')
    // NOTE: This fetch structure depends heavily on which specific API the user chooses on RapidAPI.
    // For this example, we assume an API that takes `id` as a query parameter.
    const res = await fetch(`https://${rapidApiHost}/dl?id=${videoId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('RapidAPI Error:', errorText);
      return NextResponse.json({ error: `RapidAPI Error: ${res.statusText}. Check your API quota or host.` }, { status: 500 });
    }

    const data = await res.json();
    
    // Most rapid APIs return something like { link: "...", title: "..." }
    // We try to gracefully handle different common response formats
    const downloadLink = data.link || data.url || data.downloadUrl || (data.data && data.data.url) || data.msg;
    const title = data.title || data.name || 'YouTube Audio';

    if (!downloadLink || !downloadLink.startsWith('http')) {
       return NextResponse.json({ error: 'API did not return a valid download link. You might need to adjust the API response parsing.' }, { status: 500 });
    }

    return NextResponse.json({ link: downloadLink, title });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
