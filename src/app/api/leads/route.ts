import { NextResponse } from 'next/server';

// Funkcja wyciągająca Instagram z opisu
function extractInstagram(description: string): string | null {
  if (!description) return null;
  
  // Szukamy linków instagram.com/nazwa
  const linkMatch = description.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/i);
  if (linkMatch) return linkMatch[1];

  // Szukamy wzorców typu "IG: nazwa", "Insta: @nazwa", "ig - @nazwa"
  const textMatch = description.match(/(?:ig|insta|instagram)[\s]*[:-]*[\s]*@?([a-zA-Z0-9_.-]+)/i);
  if (textMatch && textMatch[1].length > 2) return textMatch[1];

  return null;
}

export async function POST(request: Request) {
  try {
    const { query, maxResults = 25 } = await request.json();
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Brak klucza YOUTUBE_API_KEY w konfiguracji serwera.' }, { status: 500 });
    }

    if (!query) {
      return NextResponse.json({ error: 'Brak zapytania (tagu).' }, { status: 400 });
    }

    // 1. Wyszukaj filmy po podanym tagu
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=date&key=${apiKey}`
    );
    
    if (!searchRes.ok) {
      const err = await searchRes.json();
      throw new Error(err.error?.message || 'Błąd wyszukiwania YouTube');
    }
    
    const searchData = await searchRes.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    if (!videoIds) {
      return NextResponse.json({ leads: [] });
    }

    // 2. Pobierz pełne opisy tych filmów
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${apiKey}`
    );
    const videosData = await videosRes.json();

    const leads: any[] = [];

    // 3. Przeanalizuj opisy w poszukiwaniu Instagrama
    videosData.items.forEach((video: any) => {
      const channelName = video.snippet.channelTitle;
      const description = video.snippet.description;
      const videoTitle = video.snippet.title;
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      
      const instagram = extractInstagram(description);

      // Dodajemy tylko jeśli znaleźliśmy Instagrama i nie ma jeszcze tego kanału na liście
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
