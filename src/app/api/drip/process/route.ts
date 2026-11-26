import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/drip/admin';
import { processDueCampaigns } from '@/lib/drip/engine';

/**
 * Cloud worker for Auto-Drip. Called every minute by Supabase pg_cron
 * (or cron-job.org) with `Authorization: Bearer <CRON_SECRET>`.
 * Works with the user's computer completely turned off.
 */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const query = new URL(request.url).searchParams.get('secret');
  return header === secret || query === secret;
}

async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on the server.' }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const admin = getAdminClient();
    const results = await processDueCampaigns(admin, { limit: 25 });
    return NextResponse.json({ ok: true, processed: results.length, results, at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Drip worker failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
