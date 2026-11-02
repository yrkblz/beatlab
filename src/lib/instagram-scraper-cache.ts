import { supabase } from './supabase';

export interface ScrapeState {
  targetSource: string;
  mode: string;
  nextCursor?: string;
  totalScanned: number;
  totalQualified: number;
}

// In-memory fallback in case Supabase table is not yet created
const memoryCursorStore = new Map<string, ScrapeState>();
const memoryScannedUsernames = new Map<string, Set<string>>();

/**
 * Gets the current cursor position and counts for a given target account.
 */
export async function getScrapeState(
  targetSource: string,
  mode: string
): Promise<ScrapeState | null> {
  const cleanTarget = targetSource.toLowerCase().replace(/^@/, '');
  const key = `${cleanTarget}_${mode}`;

  try {
    const { data, error } = await supabase
      .from('instagram_scrape_cursors')
      .select('next_cursor, total_scanned, total_qualified')
      .eq('target_source', cleanTarget)
      .eq('mode', mode)
      .maybeSingle();

    if (!error && data) {
      return {
        targetSource: cleanTarget,
        mode,
        nextCursor: data.next_cursor || undefined,
        totalScanned: Number(data.total_scanned || 0),
        totalQualified: Number(data.total_qualified || 0),
      };
    }
  } catch (err: any) {
    // Supabase table may not exist yet; fall back gracefully
  }

  return memoryCursorStore.get(key) || null;
}

/**
 * Saves the updated pagination cursor and progress count for a target account.
 */
export async function saveScrapeState(
  targetSource: string,
  mode: string,
  nextCursor?: string,
  totalScannedDelta: number = 0,
  totalQualifiedDelta: number = 0
): Promise<void> {
  const cleanTarget = targetSource.toLowerCase().replace(/^@/, '');
  const key = `${cleanTarget}_${mode}`;

  const current = (await getScrapeState(cleanTarget, mode)) || {
    targetSource: cleanTarget,
    mode,
    totalScanned: 0,
    totalQualified: 0,
  };

  const updatedState: ScrapeState = {
    targetSource: cleanTarget,
    mode,
    nextCursor: nextCursor || undefined,
    totalScanned: current.totalScanned + totalScannedDelta,
    totalQualified: current.totalQualified + totalQualifiedDelta,
  };

  // Always update in-memory cache
  memoryCursorStore.set(key, updatedState);

  try {
    await supabase.from('instagram_scrape_cursors').upsert({
      target_source: cleanTarget,
      mode,
      next_cursor: nextCursor || null,
      total_scanned: updatedState.totalScanned,
      total_qualified: updatedState.totalQualified,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'target_source,mode',
    });
  } catch (err) {
    // Silent fallback
  }
}

/**
 * Retrieves the set of all usernames already checked for a given target account.
 */
export async function getKnownScannedUsernames(targetSource: string): Promise<Set<string>> {
  const cleanTarget = targetSource.toLowerCase().replace(/^@/, '');
  const known = new Set<string>();

  // Add from in-memory cache
  const inMem = memoryScannedUsernames.get(cleanTarget);
  if (inMem) {
    for (const u of inMem) known.add(u);
  }

  try {
    const { data, error } = await supabase
      .from('instagram_leads_cache')
      .select('scanned_username')
      .eq('target_source', cleanTarget);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row.scanned_username) {
          known.add(row.scanned_username.toLowerCase());
        }
      }
    }
  } catch (err) {
    // Silent fallback
  }

  return known;
}

/**
 * Saves a batch of scanned profiles so they are never checked again.
 */
export async function recordScannedProfiles(
  targetSource: string,
  profiles: {
    username: string;
    isQualified: boolean;
    category?: string;
    data?: any;
  }[]
): Promise<void> {
  const cleanTarget = targetSource.toLowerCase().replace(/^@/, '');

  // Update in-memory cache
  if (!memoryScannedUsernames.has(cleanTarget)) {
    memoryScannedUsernames.set(cleanTarget, new Set());
  }
  const inMem = memoryScannedUsernames.get(cleanTarget)!;
  for (const p of profiles) {
    inMem.add(p.username.toLowerCase());
  }

  // Batch insert into Supabase
  try {
    const rows = profiles.map((p) => ({
      target_source: cleanTarget,
      scanned_username: p.username.toLowerCase(),
      is_qualified: p.isQualified,
      category: p.category || null,
      profile_data: p.data || {},
      scanned_at: new Date().toISOString(),
    }));

    await supabase.from('instagram_leads_cache').upsert(rows, {
      onConflict: 'target_source,scanned_username',
    });
  } catch (err) {
    // Silent fallback
  }
}
