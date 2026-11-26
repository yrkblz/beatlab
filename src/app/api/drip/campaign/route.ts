import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient, getUserFromRequest, isServiceRoleConfigured } from '@/lib/drip/admin';
import { processDueCampaigns } from '@/lib/drip/engine';
import { isValidEmail, normalizeEmail } from '@/lib/drip/email-parser';
import { clamp, safeTimeZone } from '@/lib/drip/scheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ACTIVE_STATUSES = ['running', 'paused', 'error'];
const MAX_RECIPIENTS = 20000;

function serverConfig() {
  return {
    serviceRole: isServiceRoleConfigured(),
    cronSecret: Boolean(process.env.CRON_SECRET),
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
}

/** All e-mails this user has ever contacted (from Campaign Stats logs). */
async function loadContactedEmails(admin: SupabaseClient, userId: string): Promise<Set<string>> {
  const contacted = new Set<string>();
  const { data: camps } = await admin.from('campaigns').select('id').eq('user_id', userId).limit(5000);
  const ids = (camps || []).map((c: any) => c.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    for (let from = 0; from < 200000; from += 1000) {
      const { data: logs, error } = await admin
        .from('email_logs')
        .select('recipient_email')
        .in('campaign_id', chunk)
        .range(from, from + 999);
      if (error || !logs || logs.length === 0) break;
      logs.forEach((l: any) => l.recipient_email && contacted.add(String(l.recipient_email).toLowerCase().trim()));
      if (logs.length < 1000) break;
    }
  }
  return contacted;
}

export async function GET(request: Request) {
  const config = serverConfig();
  if (!config.serviceRole) {
    return NextResponse.json({ config, credentials: { configured: false }, campaign: null, recent: [] });
  }
  try {
    const admin = getAdminClient();
    const user = await getUserFromRequest(request, admin);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: campaign } = await admin
      .from('drip_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (campaign && new URL(request.url).searchParams.get('export') === 'remaining') {
      const emails: string[] = [];
      for (let from = 0; from < MAX_RECIPIENTS; from += 1000) {
        const { data } = await admin
          .from('drip_queue')
          .select('email')
          .eq('drip_campaign_id', campaign.id)
          .eq('status', 'pending')
          .order('position', { ascending: true })
          .range(from, from + 999);
        if (!data || data.length === 0) break;
        emails.push(...data.map((d: any) => d.email));
        if (data.length < 1000) break;
      }
      return NextResponse.json({ emails });
    }

    const { data: cred } = await admin
      .from('drip_credentials')
      .select('method, sender_email, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    let recent: any[] = [];
    if (campaign) {
      const { data } = await admin
        .from('drip_queue')
        .select('email, status, error, processed_at, subject_used')
        .eq('drip_campaign_id', campaign.id)
        .not('processed_at', 'is', null)
        .order('processed_at', { ascending: false })
        .limit(15);
      recent = data || [];
    }

    return NextResponse.json({
      config,
      credentials: { configured: Boolean(cred), method: cred?.method, senderEmail: cred?.sender_email },
      campaign: campaign || null,
      recent,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await getUserFromRequest(request, admin);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));

    // Browser assist: while the tab is open, nudge the engine for this user only.
    if (body?.action === 'tick') {
      const results = await processDueCampaigns(admin, { userId: user.id, limit: 1 });
      return NextResponse.json({ ok: true, results });
    }

    if (body?.action !== 'create') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const subject = String(body.subject || '').trim();
    const message = String(body.message || '');
    const name = String(body.name || '').trim() || subject || 'Auto-Drip';
    if (!subject || !message.trim()) {
      return NextResponse.json({ error: 'Temat i treść wiadomości są wymagane.' }, { status: 400 });
    }

    const { data: cred } = await admin.from('drip_credentials').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!cred) {
      return NextResponse.json({ error: 'Najpierw zapisz konto nadawcy (Hasło aplikacji Google).' }, { status: 400 });
    }

    const { data: active } = await admin
      .from('drip_campaigns')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ACTIVE_STATUSES)
      .limit(1);
    if (active && active.length > 0) {
      return NextResponse.json(
        { error: 'Masz już aktywną kampanię Auto-Drip. Zakończ ją lub anuluj, zanim uruchomisz nową.' },
        { status: 409 }
      );
    }

    // Server-side re-validation + de-duplication
    const seen = new Set<string>();
    let emails: string[] = [];
    for (const raw of Array.isArray(body.emails) ? body.emails : []) {
      const e = normalizeEmail(String(raw));
      if (isValidEmail(e) && !seen.has(e)) {
        seen.add(e);
        emails.push(e);
      }
    }
    if (emails.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Maksymalnie ${MAX_RECIPIENTS} odbiorców na kampanię.` }, { status: 400 });
    }

    let skipped = 0;
    if (body.skipContacted) {
      const contacted = await loadContactedEmails(admin, user.id);
      const before = emails.length;
      emails = emails.filter((e) => !contacted.has(e));
      skipped = before - emails.length;
    }
    if (emails.length === 0) {
      return NextResponse.json(
        { error: skipped > 0 ? 'Wszystkie adresy były już wcześniej kontaktowane.' : 'Brak poprawnych adresów e-mail.' },
        { status: 400 }
      );
    }

    const s = body.settings || {};
    const settings = {
      rate_per_hour: Math.round(clamp(Number(s.ratePerHour ?? 30), 5, 60)),
      jitter_pct: Math.round(clamp(Number(s.jitterPct ?? 40), 0, 80)),
      daily_limit: Math.round(clamp(Number(s.dailyLimit ?? 90), 1, 2000)),
      active_hours_start: Math.round(clamp(Number(s.activeHoursStart ?? 9), 0, 23)),
      active_hours_end: Math.round(clamp(Number(s.activeHoursEnd ?? 21), 0, 23)),
      batch_size: Math.round(clamp(Number(s.batchSize ?? 10), 0, 500)),
      batch_pause_min: Math.round(clamp(Number(s.batchPauseMin ?? 15), 0, 240)),
      timezone: safeTimeZone(s.timezone),
    };

    const attachments = (Array.isArray(body.attachments) ? body.attachments : [])
      .filter((a: any) => a && typeof a.name === 'string' && typeof a.link === 'string' && /^https?:\/\//i.test(a.link))
      .slice(0, 20)
      .map((a: any) => ({ name: a.name.slice(0, 200), link: a.link.slice(0, 2000) }));

    // Stats campaign (so opens show up in the existing "Campaign Stats" tab)
    let statsCampaignId: string | null = null;
    const { data: statsRow } = await admin
      .from('campaigns')
      .insert({ subject: `[Auto-Drip] ${name}`, total_sent: emails.length, user_id: user.id })
      .select('id')
      .single();
    if (statsRow?.id !== undefined && statsRow?.id !== null) statsCampaignId = String(statsRow.id);

    const { data: campaign, error: campErr } = await admin
      .from('drip_campaigns')
      .insert({
        user_id: user.id,
        name,
        subject,
        message,
        attachments,
        status: 'running',
        state_note: 'sending',
        ...settings,
        total_count: emails.length,
        skipped_count: skipped,
        next_send_at: new Date().toISOString(),
        stats_campaign_id: statsCampaignId,
      })
      .select('*')
      .single();
    if (campErr || !campaign) throw new Error(campErr?.message || 'Nie udało się utworzyć kampanii.');

    for (let i = 0; i < emails.length; i += 500) {
      const chunk = emails.slice(i, i + 500).map((email, idx) => ({
        drip_campaign_id: campaign.id,
        user_id: user.id,
        email,
        position: i + idx,
      }));
      const { error } = await admin.from('drip_queue').insert(chunk);
      if (error) {
        await admin.from('drip_campaigns').delete().eq('id', campaign.id);
        throw new Error(`Błąd zapisu kolejki: ${error.message}`);
      }
    }

    return NextResponse.json({ campaign, skipped });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await getUserFromRequest(request, admin);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '');
    const action = body?.action;

    const { data: campaign } = await admin
      .from('drip_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!campaign) return NextResponse.json({ error: 'Nie znaleziono kampanii.' }, { status: 404 });

    const nowIso = new Date().toISOString();
    let patch: Record<string, unknown>;
    if (action === 'pause') {
      if (campaign.status !== 'running') return NextResponse.json({ error: 'Kampania nie jest aktywna.' }, { status: 400 });
      patch = { status: 'paused', state_note: 'paused' };
    } else if (action === 'resume') {
      if (!['paused', 'error'].includes(campaign.status)) {
        return NextResponse.json({ error: 'Tej kampanii nie można wznowić.' }, { status: 400 });
      }
      patch = { status: 'running', state_note: 'sending', last_error: null, next_send_at: nowIso };
    } else if (action === 'cancel') {
      if (!ACTIVE_STATUSES.includes(campaign.status)) {
        return NextResponse.json({ error: 'Kampania jest już zakończona.' }, { status: 400 });
      }
      patch = { status: 'cancelled', state_note: 'cancelled', completed_at: nowIso };
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from('drip_campaigns')
      .update({ ...patch, updated_at: nowIso })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ campaign: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}
