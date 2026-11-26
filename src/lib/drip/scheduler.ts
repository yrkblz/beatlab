/**
 * Pure time helpers for the Auto-Drip engine (timezone-aware active hours,
 * daily limit resets and human-like jittered intervals).
 */
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function safeTimeZone(tz?: string | null): string {
  if (!tz) return 'Europe/Warsaw';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'Europe/Warsaw';
  }
}

/** Local calendar date key (YYYY-MM-DD) in the campaign timezone. */
export function localDateKey(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in `timeZone` to a UTC Date. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  let result = guess - offset;
  const offset2 = tzOffsetMs(new Date(result), timeZone);
  if (offset2 !== offset) result = guess - offset2;
  return new Date(result);
}

/** Supports normal (9-21) and overnight (22-6) windows. start === end => 24h. */
export function isWithinActiveHours(hour: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function activeWindowHours(start: number, end: number): number {
  if (start === end) return 24;
  return start < end ? end - start : 24 - start + end;
}

function addLocalDays(p: ZonedParts, days: number) {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Next moment (strictly after `now`) when the local clock hits `startHour`:00. */
export function nextWindowStart(now: Date, startHour: number, timeZone: string): Date {
  const p = getZonedParts(now, timeZone);
  let candidate = zonedTimeToUtc(p.year, p.month, p.day, startHour, 0, timeZone);
  if (candidate.getTime() <= now.getTime()) {
    const next = addLocalDays(p, 1);
    candidate = zonedTimeToUtc(next.year, next.month, next.day, startHour, 0, timeZone);
  }
  return candidate;
}

/** `startHour`:00 on the NEXT local calendar day (used after hitting the daily limit). */
export function nextDayWindowStart(now: Date, startHour: number, timeZone: string): Date {
  const p = getZonedParts(now, timeZone);
  const next = addLocalDays(p, 1);
  return zonedTimeToUtc(next.year, next.month, next.day, startHour, 0, timeZone);
}

export function clamp(n: number, min: number, max: number): number {
  const v = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, v));
}

/**
 * Base interval = 1h / ratePerHour, randomised by ±jitterPct.
 * e.g. 30/h with 40% jitter => 72s .. 168s between emails.
 */
export function computeSendInterval(
  ratePerHour: number,
  jitterPct: number,
  rand: () => number = Math.random
): number {
  const base = 3600000 / clamp(ratePerHour, 1, 120);
  const j = clamp(jitterPct, 0, 90) / 100;
  const factor = 1 - j + rand() * 2 * j;
  return Math.round(base * factor);
}
