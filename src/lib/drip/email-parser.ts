/**
 * Extracts, validates and de-duplicates e-mail addresses from many raw text
 * sources (e.g. several .txt files dropped at once).
 */
const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const STRICT_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/i;
const FILE_LIKE_TLD = /\.(png|jpe?g|gif|webp|svg|bmp|ico|css|js|mp3|wav|zip)$/i;

export function normalizeEmail(raw: string): string {
  return (raw || '')
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^mailto:/i, '')
    .replace(/^[<"'(\[]+|[>"')\],;:.]+$/g, '')
    .toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (!email || email.length > 254) return false;
  if (!STRICT_EMAIL.test(email)) return false;
  if (email.includes('..')) return false;
  const [local] = email.split('@');
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.')) return false;
  if (FILE_LIKE_TLD.test(email)) return false;
  return true;
}

export function extractEmailsFromText(text: string): string[] {
  if (!text) return [];
  return (text.match(EMAIL_IN_TEXT) || []).map(normalizeEmail);
}

export interface MergedEmails {
  emails: string[];
  totalFound: number;
  duplicates: number;
  invalid: number;
}

export function mergeEmailSources(texts: string[]): MergedEmails {
  const seen = new Set<string>();
  const emails: string[] = [];
  let totalFound = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const text of texts) {
    for (const email of extractEmailsFromText(text)) {
      totalFound++;
      if (!isValidEmail(email)) {
        invalid++;
        continue;
      }
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);
      emails.push(email);
    }
  }

  return { emails, totalFound, duplicates, invalid };
}
