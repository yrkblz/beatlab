import { spin, hasSpintax, countSpinVariants } from '@/lib/drip/spintax';
import { mergeEmailSources, extractEmailsFromText, isValidEmail } from '@/lib/drip/email-parser';
import { isWithinActiveHours, computeSendInterval, activeWindowHours } from '@/lib/drip/scheduler';
import { encryptSecret, decryptSecret } from '@/lib/drip/crypto';
import { buildDripHtml } from '@/lib/drip/email-builder';

describe('Auto-Drip Core Libraries', () => {
  describe('Spintax Engine', () => {
    it('resolves spintax options deterministically when a custom RNG is passed', () => {
      const first = spin('{Siemanko|Cześć|Elo} obczaj {nowe|świeże} bity', () => 0);
      expect(first).toBe('Siemanko obczaj nowe bity');

      const last = spin('{Siemanko|Cześć|Elo} obczaj {nowe|świeże} bity', () => 0.99);
      expect(last).toBe('Elo obczaj świeże bity');
    });

    it('detects spintax presence and counts combinations', () => {
      expect(hasSpintax('Zwykły tekst {tag}')).toBe(false);
      expect(hasSpintax('{Siema|Cześć} raper')).toBe(true);
      expect(countSpinVariants('{A|B|C} test {1|2}')).toBe(6);
    });
  });

  describe('Multi-file .txt Email Parser & Deduplicator', () => {
    it('extracts, normalizes, validates and deduplicates emails across multiple text sources', () => {
      const file1 = `
        Kontakt: RapperOne@Gmail.com, second_artist@domain.pl;
        bad@email..com
        avatar@image.png
      `;
      const file2 = `
        rapperone@gmail.com
        third.producer@studio.co.uk
        <fourth@music.com>
      `;

      const merged = mergeEmailSources([file1, file2]);
      expect(merged.emails).toEqual([
        'rapperone@gmail.com',
        'second_artist@domain.pl',
        'third.producer@studio.co.uk',
        'fourth@music.com',
      ]);
      expect(merged.duplicates).toBe(1);
      expect(merged.invalid).toBeGreaterThanOrEqual(1);
    });

    it('validates email syntax strictly and rejects image filenames', () => {
      expect(isValidEmail('artist@gmail.com')).toBe(true);
      expect(isValidEmail('banner@2x.png')).toBe(false);
      expect(isValidEmail('invalid..dots@gmail.com')).toBe(false);
      expect(extractEmailsFromText('Napisz na mailto:BeatMaker@Studio.io.')).toEqual(['beatmaker@studio.io']);
    });
  });

  describe('Scheduler & Jitter', () => {
    it('correctly checks active sending hours window', () => {
      expect(isWithinActiveHours(10, 9, 21)).toBe(true);
      expect(isWithinActiveHours(22, 9, 21)).toBe(false);
      expect(isWithinActiveHours(23, 22, 6)).toBe(true);
      expect(isWithinActiveHours(12, 22, 6)).toBe(false);
      expect(activeWindowHours(9, 21)).toBe(12);
    });

    it('computes human-like jitter intervals around the hourly rate', () => {
      // 30/h => base 120_000 ms, ±40% => 72_000 .. 168_000 ms
      expect(computeSendInterval(30, 40, () => 0)).toBe(72000);
      expect(computeSendInterval(30, 40, () => 0.5)).toBe(120000);
      expect(computeSendInterval(30, 40, () => 1)).toBe(168000);
    });
  });

  describe('AES-256-GCM Credential Encryption', () => {
    it('encrypts and decrypts Google App Password round-trip', () => {
      process.env.DRIP_ENCRYPTION_KEY = 'unit-test-secret-key-for-beatlab-drip';
      const secret = 'abcd efgh ijkl mnop';
      const enc = encryptSecret(secret);
      expect(enc).not.toContain(secret);
      expect(decryptSecret(enc)).toBe(secret);
    });
  });

  describe('HTML Email & Tracking Pixel Builder', () => {
    it('renders beat attachment cards and tracking pixel', () => {
      const html = buildDripHtml({
        message: 'Sprawdź nowe bity!\nPozdro',
        attachments: [{ name: 'Dark Drill 140bpm.mp3', link: 'https://drive.google.com/file/d/123' }],
        trackingUrl: 'https://www.beatlab.space/api/track?log_id=log-99',
      });
      expect(html).toContain('Sprawdź nowe bity!<br/>Pozdro');
      expect(html).toContain('Dark Drill 140bpm.mp3');
      expect(html).toContain('https://www.beatlab.space/api/track?log_id=log-99');
    });
  });
});
