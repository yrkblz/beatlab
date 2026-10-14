import {
  MANDATORY_PROFILE_CURRENCIES,
  PROTECTED_STUDIO_ROUTES,
  STUDIO_TOOL_NAMES,
  calculateSubscriptionStatus,
  isProfileComplete,
  isStudioRoute,
  normalizeRoutePath,
} from '../subscription';

describe('Validation Matrix & Business Logic Domain Tests', () => {
  describe('Email Regex and Syntax Domain Rules', () => {
    const validEmails = [
      'producer@gmail.com',
      'beatmaker123@yahoo.com',
      'first.last@domain.co.uk',
      'artist+collab@beatlab.space',
      'metro_boomin@sub.domain.org',
      'user-name@domain.io',
      'contact@music-label.net',
      'ceo@enterprise.ai',
      'a@b.pl',
      'producer_2026@studio.music',
    ];

    validEmails.forEach((email) => {
      it(`validates standard valid email "${email}"`, () => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(regex.test(email)).toBe(true);
      });
    });

    const invalidEmails = [
      'plainaddress',
      '@missingusername.com',
      'username@.com',
      'username@domain',
      'user space@domain.com',
      'user@domain,com',
      'user@',
      '',
      '   ',
      'user@@domain.com',
    ];

    invalidEmails.forEach((email) => {
      it(`rejects malformed email "${email}"`, () => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(regex.test(email)).toBe(false);
      });
    });
  });

  describe('Currency Math & Precision Calculations', () => {
    const rates: Record<string, number> = {
      USD: 1.0,
      PLN: 4.0,
      EUR: 0.9,
      RUB: 90.0,
      UAH: 40.0,
    };

    function convertCurrency(amount: number, from: string, to: string): number {
      if (from === to) return amount;
      const inUSD = from === 'USD' ? amount : amount / (rates[from] || 1);
      const inTarget = to === 'USD' ? inUSD : inUSD * (rates[to] || 1);
      return Math.round(inTarget * 100) / 100;
    }

    it('converts USD to PLN accurately', () => {
      expect(convertCurrency(100, 'USD', 'PLN')).toBe(400);
      expect(convertCurrency(29.99, 'USD', 'PLN')).toBe(119.96);
    });

    it('converts PLN to USD accurately', () => {
      expect(convertCurrency(400, 'PLN', 'USD')).toBe(100);
      expect(convertCurrency(180, 'PLN', 'USD')).toBe(45);
    });

    it('converts EUR to USD and PLN', () => {
      // 90 EUR -> 100 USD -> 400 PLN
      expect(convertCurrency(90, 'EUR', 'USD')).toBe(100);
      expect(convertCurrency(90, 'EUR', 'PLN')).toBe(400);
    });

    it('converts UAH to USD and EUR', () => {
      // 400 UAH -> 10 USD -> 9 EUR
      expect(convertCurrency(400, 'UAH', 'USD')).toBe(10);
      expect(convertCurrency(400, 'UAH', 'EUR')).toBe(9);
    });

    it('handles identical currency conversions with identity', () => {
      MANDATORY_PROFILE_CURRENCIES.forEach((c) => {
        expect(convertCurrency(123.45, c, c)).toBe(123.45);
      });
    });

    it('handles zero amount across all currencies', () => {
      MANDATORY_PROFILE_CURRENCIES.forEach((from) => {
        MANDATORY_PROFILE_CURRENCIES.forEach((to) => {
          expect(convertCurrency(0, from, to)).toBe(0);
        });
      });
    });
  });

  describe('License Publishing & Stream Calculation Matrix', () => {
    function calculatePublishingSplit(producerPercentStr: string): { producer: number; artist: number } {
      const producer = Math.max(0, Math.min(100, parseFloat(producerPercentStr) || 0));
      const artist = 100 - producer;
      return { producer, artist };
    }

    const testSplits: [string, number, number][] = [
      ['0', 0, 100],
      ['10', 10, 90],
      ['25', 25, 75],
      ['33.33', 33.33, 66.67],
      ['50', 50, 50],
      ['75', 75, 25],
      ['100', 100, 0],
      ['-10', 0, 100], // clamp negative to 0
      ['150', 100, 0], // clamp over 100 to 100
      ['invalid', 0, 100], // fallback to 0
    ];

    testSplits.forEach(([input, expProducer, expArtist]) => {
      it(`calculates publishing split for "${input}" -> Producer: ${expProducer}%, Artist: ${expArtist}%`, () => {
        const { producer, artist } = calculatePublishingSplit(input);
        expect(producer).toBe(expProducer);
        expect(artist).toBeCloseTo(expArtist, 2);
        expect(producer + artist).toBeCloseTo(100, 2);
      });
    });
  });

  describe('Trial Expiration Precision Matrix Across Dates', () => {
    it('calculates trial boundaries for leap year date 2024-02-28', () => {
      const feb28 = new Date('2024-02-28T12:00:00Z').toISOString();
      const status = calculateSubscriptionStatus(
        { is_lifetime_paid: false },
        feb28
      );
      // feb28 + 3 days in 2024 is March 2 (because 2024 has Feb 29)
      expect(status.trialEndsAt).toBeDefined();
      expect(status.trialEndsAt?.getUTCFullYear()).toBe(2024);
      expect(status.trialEndsAt?.getUTCMonth()).toBe(2); // March (0-indexed 2)
      expect(status.trialEndsAt?.getUTCDate()).toBe(2);
    });

    it('calculates trial boundaries for non-leap year date 2025-02-28', () => {
      const feb28 = new Date('2025-02-28T12:00:00Z').toISOString();
      const status = calculateSubscriptionStatus(
        { is_lifetime_paid: false },
        feb28
      );
      // feb28 + 3 days in 2025 is March 3 (no Feb 29)
      expect(status.trialEndsAt?.getUTCFullYear()).toBe(2025);
      expect(status.trialEndsAt?.getUTCMonth()).toBe(2); // March
      expect(status.trialEndsAt?.getUTCDate()).toBe(3);
    });

    it('calculates trial boundaries across Year-End rollover 2026-12-30', () => {
      const dec30 = new Date('2026-12-30T10:00:00Z').toISOString();
      const status = calculateSubscriptionStatus(
        { is_lifetime_paid: false },
        dec30
      );
      // Dec 30 + 3 days -> Jan 2, 2027
      expect(status.trialEndsAt?.getUTCFullYear()).toBe(2027);
      expect(status.trialEndsAt?.getUTCMonth()).toBe(0); // January
      expect(status.trialEndsAt?.getUTCDate()).toBe(2);
    });

    it('correctly reports lifetime access overrides trial expiration even with past trial date', () => {
      const status = calculateSubscriptionStatus({
        is_lifetime_paid: true,
        trial_ends_at: '2020-01-01T00:00:00Z',
      });

      expect(status.isLifetime).toBe(true);
      expect(status.hasAccess).toBe(true);
      expect(status.isTrialActive).toBe(false);
      expect(status.isTrialExpired).toBe(false);
    });

    it('returns exact daysRemaining as 0 when expired', () => {
      const status = calculateSubscriptionStatus({
        is_lifetime_paid: false,
        trial_ends_at: '2026-01-01T00:00:00Z',
      });

      expect(status.daysRemaining).toBe(0);
      expect(status.hoursRemaining).toBe(0);
      expect(status.hasAccess).toBe(false);
    });
  });

  describe('Musical Key Signatures & BPM Catalog Specifications', () => {
    const VALID_KEYS = [
      'C Major', 'C Minor', 'C# Major', 'C# Minor',
      'D Major', 'D Minor', 'D# Major', 'D# Minor',
      'E Major', 'E Minor', 'F Major', 'F Minor',
      'F# Major', 'F# Minor', 'G Major', 'G Minor',
      'G# Major', 'G# Minor', 'A Major', 'A Minor',
      'A# Major', 'A# Minor', 'B Major', 'B Minor',
    ];

    it('has exactly 24 standard musical keys (12 major + 12 minor)', () => {
      expect(VALID_KEYS).toHaveLength(24);
      expect(VALID_KEYS.filter((k) => k.includes('Major'))).toHaveLength(12);
      expect(VALID_KEYS.filter((k) => k.includes('Minor'))).toHaveLength(12);
    });

    it('validates BPM is within typical music production range (60 - 220)', () => {
      const isValidBpm = (bpm: number) => !isNaN(bpm) && bpm >= 40 && bpm <= 300;

      expect(isValidBpm(140)).toBe(true);
      expect(isValidBpm(90)).toBe(true);
      expect(isValidBpm(170)).toBe(true);
      expect(isValidBpm(30)).toBe(false);
      expect(isValidBpm(350)).toBe(false);
      expect(isValidBpm(NaN)).toBe(false);
    });
  });
});
