import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function extractYouTubeVideoId(inputUrl: string): string | null {
  try {
    const trimmed = inputUrl.trim();
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    const longMatch = trimmed.match(/(?:watch\?v=|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (longMatch) return longMatch[1];

    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) return vParam;

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string' || !url.includes('youtu')) {
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

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract a valid 11-character video ID from the provided YouTube URL' }, { status: 400 });
    }

    let downloadLink = '';
    let title = 'YouTube Audio';
    let lastError = '';

    const maxAttempts = 10;
    const delayMs = 1500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(`https://${rapidApiHost}/dl?id=${videoId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': rapidApiHost,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`RapidAPI Error (attempt ${attempt}):`, errorText);
        if (attempt === maxAttempts) {
          return NextResponse.json(
            { error: `RapidAPI Error: ${res.statusText}. Please verify your API quota or host.` },
            { status: 500 }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      const data = await res.json();

      if (data.status === 'fail' || data.status === 'error') {
        const failMsg = data.msg || data.error || 'Failed to convert YouTube video.';
        return NextResponse.json({ error: failMsg }, { status: 400 });
      }

      const candidateLink =
        data.link ||
        data.url ||
        data.downloadUrl ||
        (data.data && (data.data.url || data.data.link));

      if (candidateLink && typeof candidateLink === 'string' && candidateLink.startsWith('http')) {
        downloadLink = candidateLink;
        title = data.title || data.name || title;
        break;
      }

      // If video is still converting on RapidAPI servers (in queue / progress < 100)
      if (
        data.status === 'processing' ||
        data.progress !== 100 ||
        data.msg === 'in queue' ||
        data.msg === 'processing'
      ) {
        if (data.title) title = data.title;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }

      lastError = data.msg || data.error || '';
    }

    if (!downloadLink) {
      return NextResponse.json(
        {
          error:
            lastError ||
            'Conversion is still processing on the server. Please click "Convert to MP3" again in a few moments to retrieve the completed audio.',
        },
        { status: 504 }
      );
    }

    return NextResponse.json({ link: downloadLink, title });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
