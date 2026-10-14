import {
  MANDATORY_PROFILE_CURRENCIES,
  PROTECTED_STUDIO_ROUTES,
  STUDIO_TOOL_NAMES,
  calculateSubscriptionStatus,
  isProfileComplete,
  isStudioRoute,
  normalizeRoutePath,
} from '../subscription';

describe('Analytics, Date Matrix & Domain Engine Unit Tests', () => {
  describe('Timezone & Date Math Boundaries', () => {
    it('accurately calculates milliseconds in days across varying day counts', () => {
      const msPerDay = 24 * 60 * 60 * 1000;
      expect(msPerDay).toBe(86400000);
      expect(3 * msPerDay).toBe(259200000); // exactly 3 days free trial
      expect(7 * msPerDay).toBe(604800000);
      expect(30 * msPerDay).toBe(2592000000);
    });

    it('determines trial end instant for arbitrary starting timestamps', () => {
      const start = new Date('2026-06-15T14:30:00.000Z');
      const expectedEnd = new Date('2026-06-18T14:30:00.000Z');
      const calculatedEnd = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
      expect(calculatedEnd.toISOString()).toBe(expectedEnd.toISOString());
    });

    it('computes exact hours remaining before trial expiration', () => {
      const now = new Date('2026-06-16T12:00:00Z');
      const trialEnd = new Date('2026-06-18T18:00:00Z');
      const diffMs = trialEnd.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
      expect(hoursRemaining).toBe(54); // 2 days + 6 hours = 54 hours
    });

    it('handles negative or past trial dates without producing negative days remaining', () => {
      const now = new Date('2026-06-25T12:00:00Z');
      const trialEnd = new Date('2026-06-18T18:00:00Z');
      const diffMs = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      expect(daysRemaining).toBe(0);
    });

    it('evaluates month rollover from January 31 to February across leap and non-leap years', () => {
      const jan31Leap = new Date('2024-01-31T00:00:00Z');
      const feb3Leap = new Date(jan31Leap.getTime() + 3 * 86400000);
      expect(feb3Leap.getUTCMonth()).toBe(1); // February
      expect(feb3Leap.getUTCDate()).toBe(3);

      const jan31Common = new Date('2025-01-31T00:00:00Z');
      const feb3Common = new Date(jan31Common.getTime() + 3 * 86400000);
      expect(feb3Common.getUTCMonth()).toBe(1);
      expect(feb3Common.getUTCDate()).toBe(3);
    });

    it('evaluates Leap Day February 29 rollover', () => {
      const feb27_2024 = new Date('2024-02-27T00:00:00Z');
      const after3Days = new Date(feb27_2024.getTime() + 3 * 86400000);
      expect(after3Days.getUTCMonth()).toBe(2); // March
      expect(after3Days.getUTCDate()).toBe(1); // March 1st because Feb 29 exists in 2024
    });

    it('evaluates non-leap year February rollover', () => {
      const feb27_2025 = new Date('2025-02-27T00:00:00Z');
      const after3Days = new Date(feb27_2025.getTime() + 3 * 86400000);
      expect(after3Days.getUTCMonth()).toBe(2); // March
      expect(after3Days.getUTCDate()).toBe(2); // March 2nd because Feb has 28 days
    });

    it('formats countdown string properly for various millisecond durations', () => {
      function formatCountdown(ms: number) {
        if (ms <= 0) return '00:00:00';
        const totalSec = Math.floor(ms / 1000);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
      }

      expect(formatCountdown(0)).toBe('00:00:00');
      expect(formatCountdown(-5000)).toBe('00:00:00');
      expect(formatCountdown(65000)).toBe('00:01:05');
      expect(formatCountdown(3665000)).toBe('01:01:05');
      expect(formatCountdown(86400000)).toBe('24:00:00');
      expect(formatCountdown(259200000)).toBe('72:00:00');
    });

    it('simulates Daylight Saving Time hour shifts in UTC vs Local timestamps', () => {
      // UTC timestamps are monotonically increasing by 86400s per day
      const d1 = new Date('2026-03-28T12:00:00Z');
      const d2 = new Date('2026-03-29T12:00:00Z');
      expect(d2.getTime() - d1.getTime()).toBe(86400000);
    });
  });

  describe('Audio File Formats & Upload Specifications', () => {
    const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aif', '.aiff', '.flac', '.m4a'];
    const DISALLOWED_EXTENSIONS = ['.exe', '.sh', '.bat', '.zip', '.rar', '.pdf', '.docx', '.png', '.mp4'];

    function validateAudioExtension(filename: string): boolean {
      const lower = filename.toLowerCase();
      return ALLOWED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
    }

    ALLOWED_AUDIO_EXTENSIONS.forEach((ext) => {
      it(`accepts audio file with extension "${ext}"`, () => {
        expect(validateAudioExtension(`producer_track${ext}`)).toBe(true);
        expect(validateAudioExtension(`My_Beat_2026${ext.toUpperCase()}`)).toBe(true);
      });
    });

    DISALLOWED_EXTENSIONS.forEach((ext) => {
      it(`rejects non-audio file with extension "${ext}"`, () => {
        expect(validateAudioExtension(`malicious_script${ext}`)).toBe(false);
        expect(validateAudioExtension(`archive${ext.toUpperCase()}`)).toBe(false);
      });
    });

    it('validates audio file size within max quota limit of 250MB', () => {
      const MAX_BEAT_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
      const isWithinLimit = (bytes: number) => bytes > 0 && bytes <= MAX_BEAT_SIZE_BYTES;

      expect(isWithinLimit(10 * 1024 * 1024)).toBe(true); // 10MB MP3
      expect(isWithinLimit(75 * 1024 * 1024)).toBe(true); // 75MB WAV
      expect(isWithinLimit(250 * 1024 * 1024)).toBe(true); // Exact 250MB
      expect(isWithinLimit(251 * 1024 * 1024)).toBe(false); // 251MB Exceeds
      expect(isWithinLimit(0)).toBe(false); // 0 bytes empty file
      expect(isWithinLimit(-100)).toBe(false);
    });

    it('validates common audio MIME types', () => {
      const VALID_AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-aiff'];
      const isValidAudioMime = (mime: string) => VALID_AUDIO_MIMES.includes(mime.toLowerCase());

      expect(isValidAudioMime('audio/mpeg')).toBe(true);
      expect(isValidAudioMime('audio/wav')).toBe(true);
      expect(isValidAudioMime('audio/flac')).toBe(true);
      expect(isValidAudioMime('video/mp4')).toBe(false);
      expect(isValidAudioMime('application/pdf')).toBe(false);
      expect(isValidAudioMime('image/jpeg')).toBe(false);
    });
  });

  describe('Financial Revenue & Net Calculation Engine', () => {
    interface SaleItem {
      amount: number;
      currency: string;
      platform: 'direct' | 'beatstars' | 'airbit';
      date: string;
    }

    const testSales: SaleItem[] = [
      { amount: 30, currency: 'USD', platform: 'direct', date: '2026-05-01' },
      { amount: 199, currency: 'USD', platform: 'beatstars', date: '2026-05-02' },
      { amount: 120, currency: 'PLN', platform: 'direct', date: '2026-05-05' },
      { amount: 80, currency: 'EUR', platform: 'direct', date: '2026-05-10' },
      { amount: 2500, currency: 'UAH', platform: 'direct', date: '2026-05-15' },
    ];

    it('calculates gross revenue grouped by raw currency', () => {
      const sums: Record<string, number> = {};
      testSales.forEach((s) => {
        sums[s.currency] = (sums[s.currency] || 0) + s.amount;
      });

      expect(sums['USD']).toBe(229);
      expect(sums['PLN']).toBe(120);
      expect(sums['EUR']).toBe(80);
      expect(sums['UAH']).toBe(2500);
      expect(sums['RUB'] || 0).toBe(0);
    });

    it('calculates total converted revenue in USD using exchange rate map', () => {
      const ratesToUSD: Record<string, number> = {
        USD: 1.0,
        PLN: 0.25, // 1 PLN = 0.25 USD
        EUR: 1.1,  // 1 EUR = 1.10 USD
        UAH: 0.025, // 1 UAH = 0.025 USD
        RUB: 0.011,
      };

      const totalUSD = testSales.reduce((acc, sale) => {
        const rate = ratesToUSD[sale.currency] || 1;
        return acc + sale.amount * rate;
      }, 0);

      // USD: 229 * 1 = 229
      // PLN: 120 * 0.25 = 30
      // EUR: 80 * 1.10 = 88
      // UAH: 2500 * 0.025 = 62.5
      // Total = 229 + 30 + 88 + 62.5 = 409.5
      expect(totalUSD).toBeCloseTo(409.5, 2);
    });

    it('calculates net payout deducting standard payment processing fee (Stripe: 2.9% + $0.30)', () => {
      function calculateStripeNet(amount: number): number {
        if (amount <= 0) return 0;
        const fee = amount * 0.029 + 0.3;
        const net = amount - fee;
        return Math.round(net * 100) / 100;
      }

      expect(calculateStripeNet(29.0)).toBe(27.86); // 29 - (0.841 + 0.30) = 29 - 1.141 = 27.859 -> 27.86
      expect(calculateStripeNet(100.0)).toBe(96.8); // 100 - (2.90 + 0.30) = 96.80
      expect(calculateStripeNet(199.0)).toBe(192.93); // 199 - (5.771 + 0.30) = 192.929 -> 192.93
      expect(calculateStripeNet(0)).toBe(0);
    });

    it('filters sales correctly within inclusive date range', () => {
      const startDate = '2026-05-02';
      const endDate = '2026-05-10';

      const filtered = testSales.filter((s) => s.date >= startDate && s.date <= endDate);
      expect(filtered).toHaveLength(3);
      expect(filtered.map((s) => s.amount)).toEqual([199, 120, 80]);
    });

    it('formats currency values with proper decimal representation', () => {
      function formatMoney(amount: number, currency: string): string {
        return `${amount.toFixed(2)} ${currency}`;
      }

      expect(formatMoney(29, 'USD')).toBe('29.00 USD');
      expect(formatMoney(199.5, 'EUR')).toBe('199.50 EUR');
      expect(formatMoney(0, 'PLN')).toBe('0.00 PLN');
    });
  });

  describe('Placement CRM Pipeline Status Matrix', () => {
    type PlacementStatus = 'to_send' | 'sent' | 'listened' | 'placement' | 'rejected' | 'archived';

    const PIPELINE_COLUMNS: PlacementStatus[] = ['to_send', 'sent', 'listened', 'placement'];

    const isValidTransition = (from: PlacementStatus, to: PlacementStatus): boolean => {
      const allowedNext: Record<PlacementStatus, PlacementStatus[]> = {
        to_send: ['sent', 'archived', 'rejected'],
        sent: ['listened', 'to_send', 'archived', 'rejected'],
        listened: ['placement', 'sent', 'archived', 'rejected'],
        placement: ['archived'],
        rejected: ['to_send', 'archived'],
        archived: ['to_send'],
      };
      return allowedNext[from]?.includes(to) ?? false;
    };

    it('permits forward pipeline progressions', () => {
      expect(isValidTransition('to_send', 'sent')).toBe(true);
      expect(isValidTransition('sent', 'listened')).toBe(true);
      expect(isValidTransition('listened', 'placement')).toBe(true);
    });

    it('permits archiving or rejection from active states', () => {
      expect(isValidTransition('to_send', 'rejected')).toBe(true);
      expect(isValidTransition('sent', 'archived')).toBe(true);
      expect(isValidTransition('listened', 'rejected')).toBe(true);
      expect(isValidTransition('placement', 'archived')).toBe(true);
    });

    it('rejects illegal transitions', () => {
      expect(isValidTransition('to_send', 'placement')).toBe(false); // cannot jump directly to placement
      expect(isValidTransition('placement', 'to_send')).toBe(false);
      expect(isValidTransition('placement', 'sent')).toBe(false);
    });

    it('groups placements by status column correctly', () => {
      const records = [
        { id: 1, artist: 'Drake', status: 'sent' as PlacementStatus },
        { id: 2, artist: 'Travis Scott', status: 'listened' as PlacementStatus },
        { id: 3, artist: 'Future', status: 'sent' as PlacementStatus },
        { id: 4, artist: '21 Savage', status: 'placement' as PlacementStatus },
        { id: 5, artist: 'Lil Baby', status: 'to_send' as PlacementStatus },
      ];

      const grouped: Record<PlacementStatus, typeof records> = {
        to_send: [],
        sent: [],
        listened: [],
        placement: [],
        rejected: [],
        archived: [],
      };

      records.forEach((r) => grouped[r.status].push(r));

      expect(grouped['to_send']).toHaveLength(1);
      expect(grouped['sent']).toHaveLength(2);
      expect(grouped['listened']).toHaveLength(1);
      expect(grouped['placement']).toHaveLength(1);
      expect(grouped['rejected']).toHaveLength(0);
    });
  });

  describe('Route URL Matrix & Query String Normalization', () => {
    function sanitizePath(rawUrl: string): string {
      try {
        const withoutQuery = rawUrl.split('?')[0];
        const withoutHash = withoutQuery.split('#')[0];
        const lower = withoutHash.toLowerCase().trim();
        const collapsed = lower.replace(/\/+/g, '/');
        const trimmed = collapsed.endsWith('/') && collapsed.length > 1
          ? collapsed.slice(0, -1)
          : collapsed;
        return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      } catch {
        return '/';
      }
    }

    const testRoutes: [string, string][] = [
      ['/bity', '/bity'],
      ['/BITY', '/bity'],
      ['/bity/', '/bity'],
      ['/bity?genre=trap&bpm=140', '/bity'],
      ['/bity#player', '/bity'],
      ['/crm?status=sent#top', '/crm'],
      ['//crm///', '/crm'],
      ['/licenses?type=exclusive', '/licenses'],
      ['/FINANSE/?period=this_month', '/finanse'],
      ['/VALIDATOR?file=test.wav', '/validator'],
      ['/downloader?v=12345', '/downloader'],
      ['/publisher?platform=ig', '/publisher'],
      ['/LEADS?sort=desc', '/leads'],
      ['/settings', '/settings'],
      ['/upgrade', '/upgrade'],
      ['/terms', '/terms'],
      ['/privacy', '/privacy'],
      ['/cookies', '/cookies'],
      ['/', '/'],
      ['///', '/'],
    ];

    testRoutes.forEach(([input, expected]) => {
      it(`sanitizes "${input}" -> "${expected}"`, () => {
        expect(sanitizePath(input)).toBe(expected);
      });
    });

    it('accurately identifies whether sanitized routes are protected studio routes', () => {
      const publicRoutes = ['/', '/terms', '/privacy', '/cookies', '/upgrade', '/login', '/register'];
      publicRoutes.forEach((route) => {
        const sanitized = sanitizePath(route);
        expect(isStudioRoute(sanitized)).toBe(false);
      });

      PROTECTED_STUDIO_ROUTES.forEach((route) => {
        const withParams = `${route}?test=1#anchor`;
        const sanitized = sanitizePath(withParams);
        expect(isStudioRoute(sanitized)).toBe(true);
      });
    });

    it('contains all 9 Studio tool names in STUDIO_TOOL_NAMES lookup', () => {
      expect(STUDIO_TOOL_NAMES['/bity']).toBe('Beat Catalog');
      expect(STUDIO_TOOL_NAMES['/crm']).toBe('Placement CRM');
      expect(STUDIO_TOOL_NAMES['/licenses']).toBe('License Generator');
      expect(STUDIO_TOOL_NAMES['/finanse']).toBe('Finance Hub');
      expect(STUDIO_TOOL_NAMES['/mailer']).toBe('Mail Tracker');
      expect(STUDIO_TOOL_NAMES['/leads']).toBe('Lead Finder');
      expect(STUDIO_TOOL_NAMES['/validator']).toBe('Email Validator');
      expect(STUDIO_TOOL_NAMES['/downloader']).toBe('YT Downloader');
      expect(STUDIO_TOOL_NAMES['/publisher']).toBe('Social Publisher');
    });
  });
});
