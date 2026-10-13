import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { videoUrl, filePath, text, platforms } = body;

    if (!filePath || typeof filePath !== 'string' || filePath.includes('/') || filePath.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filePath' }, { status: 400 });
    }

    // Mock the TikTok/Instagram API delay
    await new Promise(res => setTimeout(res, 3000));

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not found');
      return NextResponse.json({ error: 'Supabase credentials not found' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete the file from temp_social_videos
    const { error: deleteError } = await supabase.storage
      .from('temp_social_videos')
      .remove([filePath]);

    if (deleteError) {
      console.error('Failed to delete temp video:', deleteError);
    }

    return NextResponse.json({ success: true, message: 'Published and cleaned up successfully' });
  } catch (error: any) {
    console.error('Publish API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
