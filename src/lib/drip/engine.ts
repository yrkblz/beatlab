import type { SupabaseClient } from '@supabase/supabase-js';
import { spin } from './spintax';
import { buildDripHtml, type DripAttachment } from './email-builder';
import { sendDripEmail } from './sender';
import { DripSendError } from './errors';
import { decryptSecret } from './crypto';
import {
  getZonedParts,
  localDateKey,
  isWithinActiveHours,
  nextWindowStart,
  nextDayWindowStart,
  computeSendInterval,
  safeTimeZone,
} from './scheduler';

export interface DripCampaignRow {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  message: string;
  attachments: DripAttachment[] | null;
  status: string;
  state_note?: string | null;
  rate_per_hour: number;
  jitter_pct: number;
  daily_limit: number;
  active_hours_start: number;
  active_hours_end: number;
  timezone: string;
  batch_size: number;
  batch_pause_min: number;
  total_count: number;
  sent_count: number;
  failed_count: number;
  sent_today: number;
  sent_today_date: string | null;
  next_send_at: string;
  stats_campaign_id: string | null;
}

export type DripOutcome =
  | 'sent'
  | 'outside_hours'
  | 'daily_limit'
  | 'locked'
  | 'completed'
  | 'auth_error'
  | 'quota'
  | 'recipient_failed'
  | 'retry'
  | 'no_credentials'
  | 'crash';

export interface DripResult {
  id: string;
  outcome: DripOutcome;
  email?: string;
  until?: string;
  error?: string;
}

/** Lease that prevents two overlapping cron calls from sending the same e-mail. */
const LEASE_MS = 3 * 60 * 1000;

function randomMs(max: number): number {
  return Math.floor(Math.random() * max);
}

async function updateCampaign(admin: SupabaseClient, id: string, patch: Record<string, unknown>) {
  await admin
    .from('drip_campaigns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function processDueCampaigns(
  admin: SupabaseClient,
  opts: { userId?: string; limit?: number; now?: Date } = {}
): Promise<DripResult[]> {
  const now = opts.now ?? new Date();
  let query = admin
    .from('drip_campaigns')
    .select('*')
    .eq('status', 'running')
    .lte('next_send_at', now.toISOString());
  if (opts.userId) query = query.eq('user_id', opts.userId);
  const { data, error } = await query.order('next_send_at', { ascending: true }).limit(opts.limit ?? 25);
  if (error) throw new Error(error.message);

  const results: DripResult[] = [];
  for (const campaign of (data || []) as DripCampaignRow[]) {
    try {
      results.push(await processCampaign(admin, campaign, now));
    } catch (err: any) {
      results.push({ id: campaign.id, outcome: 'crash', error: err?.message || String(err) });
    }
  }
  return results;
}

export async function processCampaign(
  admin: SupabaseClient,
  c: DripCampaignRow,
  now: Date = new Date()
): Promise<DripResult> {
  const tz = safeTimeZone(c.timezone);
  const nowIso = now.toISOString();
  const todayKey = localDateKey(now, tz);
  const sentToday = c.sent_today_date === todayKey ? c.sent_today || 0 : 0;
  const { hour } = getZonedParts(now, tz);

  // 1) Outside active hours -> sleep until the window opens (+ up to 5 min of randomness)
  if (!isWithinActiveHours(hour, c.active_hours_start, c.active_hours_end)) {
    const until = new Date(nextWindowStart(now, c.active_hours_start, tz).getTime() + randomMs(5 * 60000));
    await updateCampaign(admin, c.id, {
      next_send_at: until.toISOString(),
      state_note: 'outside_hours',
      sent_today: sentToday,
      sent_today_date: todayKey,
    });
    return { id: c.id, outcome: 'outside_hours', until: until.toISOString() };
  }

  // 2) Daily safety limit reached -> sleep until tomorrow's window
  if (sentToday >= c.daily_limit) {
    const until = new Date(nextDayWindowStart(now, c.active_hours_start, tz).getTime() + randomMs(10 * 60000));
    await updateCampaign(admin, c.id, {
      next_send_at: until.toISOString(),
      state_note: 'daily_limit',
      sent_today: sentToday,
      sent_today_date: todayKey,
    });
    return { id: c.id, outcome: 'daily_limit', until: until.toISOString() };
  }

  // 3) Claim the campaign atomically (optimistic lease)
  const { data: claimed } = await admin
    .from('drip_campaigns')
    .update({ next_send_at: new Date(now.getTime() + LEASE_MS).toISOString(), state_note: 'sending' })
    .eq('id', c.id)
    .eq('status', 'running')
    .lte('next_send_at', nowIso)
    .select('id');
  if (!claimed || claimed.length === 0) {
    return { id: c.id, outcome: 'locked' };
  }

  // 4) Next recipient
  const { data: items } = await admin
    .from('drip_queue')
    .select('*')
    .eq('drip_campaign_id', c.id)
    .eq('status', 'pending')
    .order('position', { ascending: true })
    .limit(1);
  const item = (items || [])[0] as { id: number; email: string; attempts: number } | undefined;
  if (!item) {
    await updateCampaign(admin, c.id, {
      status: 'completed',
      state_note: 'completed',
      next_send_at: nowIso,
      completed_at: nowIso,
    });
    return { id: c.id, outcome: 'completed' };
  }

  // 5) Sender credentials
  const { data: credRow } = await admin
    .from('drip_credentials')
    .select('*')
    .eq('user_id', c.user_id)
    .maybeSingle();
  let secret = '';
  try {
    if (!credRow) throw new Error('missing');
    secret = decryptSecret(credRow.secret_encrypted);
  } catch {
    await updateCampaign(admin, c.id, {
      status: 'error',
      state_note: 'auth_error',
      last_error: 'Brak poprawnie zapisanego konta nadawcy. Zapisz Hasło aplikacji Google w zakładce Auto-Drip i wznów kampanię.',
      next_send_at: nowIso,
    });
    return { id: c.id, outcome: 'no_credentials' };
  }

  // 6) Tracking log (feeds the existing Campaign Stats tab)
  let logId: string | number | undefined;
  if (c.stats_campaign_id) {
    const { data: log } = await admin
      .from('email_logs')
      .insert({ campaign_id: c.stats_campaign_id, recipient_email: item.email })
      .select('id')
      .single();
    logId = (log as any)?.id;
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const trackingUrl = logId && appUrl.startsWith('https://') ? `${appUrl}/api/track?log_id=${logId}` : null;

  const subject = spin(c.subject);
  const html = buildDripHtml({ message: spin(c.message), attachments: c.attachments || [], trackingUrl });

  // 7) Send
  try {
    await sendDripEmail(
      { method: credRow.method, senderEmail: credRow.sender_email, secret },
      { to: item.email, subject, html }
    );
  } catch (err: any) {
    if (logId !== undefined) {
      await admin.from('email_logs').delete().eq('id', logId);
    }
    const kind = err instanceof DripSendError ? err.kind : 'transient';
    const msg: string = err?.message || 'Nieznany błąd wysyłki';

    if (kind === 'auth') {
      await updateCampaign(admin, c.id, { status: 'error', state_note: 'auth_error', last_error: msg, next_send_at: nowIso });
      return { id: c.id, outcome: 'auth_error', email: item.email, error: msg };
    }
    if (kind === 'quota') {
      const until = new Date(nextDayWindowStart(now, c.active_hours_start, tz).getTime() + randomMs(15 * 60000));
      await updateCampaign(admin, c.id, {
        state_note: 'quota',
        last_error: msg,
        next_send_at: until.toISOString(),
        sent_today: sentToday,
        sent_today_date: todayKey,
      });
      return { id: c.id, outcome: 'quota', email: item.email, until: until.toISOString(), error: msg };
    }

    const attempts = (item.attempts || 0) + 1;
    const giveUp = kind === 'recipient' || attempts >= 3;
    await admin
      .from('drip_queue')
      .update({
        status: giveUp ? 'failed' : 'pending',
        attempts,
        error: msg,
        processed_at: giveUp ? nowIso : null,
      })
      .eq('id', item.id);
    const retryDelay = giveUp ? 20000 + randomMs(40000) : 5 * 60000;
    await updateCampaign(admin, c.id, {
      failed_count: (c.failed_count || 0) + (giveUp ? 1 : 0),
      last_error: `${item.email}: ${msg}`,
      state_note: giveUp ? 'sending' : 'retry',
      next_send_at: new Date(now.getTime() + retryDelay).toISOString(),
    });
    return { id: c.id, outcome: giveUp ? 'recipient_failed' : 'retry', email: item.email, error: msg };
  }

  // 8) Success -> schedule next email with human-like jitter + batch pauses
  await admin
    .from('drip_queue')
    .update({ status: 'sent', processed_at: nowIso, error: null, attempts: (item.attempts || 0) + 1, subject_used: subject })
    .eq('id', item.id);

  const newSent = (c.sent_count || 0) + 1;
  let delay = computeSendInterval(c.rate_per_hour, c.jitter_pct);
  let note = 'sending';
  if (c.batch_size > 0 && c.batch_pause_min > 0 && newSent % c.batch_size === 0) {
    delay += Math.round(c.batch_pause_min * 60000 * (0.8 + Math.random() * 0.4));
    note = 'batch_pause';
  }

  const { count: remaining } = await admin
    .from('drip_queue')
    .select('id', { count: 'exact', head: true })
    .eq('drip_campaign_id', c.id)
    .eq('status', 'pending');
  const done = remaining === 0;

  await updateCampaign(admin, c.id, {
    sent_count: newSent,
    sent_today: sentToday + 1,
    sent_today_date: todayKey,
    last_sent_at: nowIso,
    last_error: null,
    state_note: done ? 'completed' : note,
    next_send_at: done ? nowIso : new Date(now.getTime() + delay).toISOString(),
    ...(done ? { status: 'completed', completed_at: nowIso } : {}),
  });

  return { id: c.id, outcome: done ? 'completed' : 'sent', email: item.email };
}
