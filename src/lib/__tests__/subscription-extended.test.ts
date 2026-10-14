import {
  calculateSubscriptionStatus,
  isProfileComplete,
  isStudioRoute,
  isAccountRoute,
  isProtectedRoute,
  isPublicRoute,
  normalizeRoutePath,
  PROTECTED_STUDIO_ROUTES,
  STUDIO_TOOL_NAMES,
  PUBLIC_ROUTES,
  MANDATORY_PROFILE_CURRENCIES,
} from '../subscription';

describe('subscription-extended test suite', () => {
  describe('normalizeRoutePath parameterization', () => {
    const testCases: [string | null | undefined, string][] = [
      ['', '/'],
      [null, '/'],
      [undefined, '/'],
      ['/', '/'],
      ['///', '/'],
      ['/bity', '/bity'],
      ['/BITY', '/bity'],
      ['/bity/', '/bity'],
      ['/bity///', '/bity'],
      [' /bity ', '/bity'],
      ['/crm?tab=sent', '/crm'],
      ['/crm?tab=sent&filter=active', '/crm'],
      ['/crm#notes-section', '/crm'],
      ['/crm?tab=all#top', '/crm'],
      ['/licenses?beat=123#preview', '/licenses'],
      ['/downloader?url=https%3A%2F%2Fyoutube.com', '/downloader'],
      ['/UPGRADE?canceled=true', '/upgrade'],
      ['/account/settings#profile', '/account/settings'],
      ['/api/leads?tag=rap', '/api/leads'],
      ['/terms', '/terms'],
      ['/privacy#cookies', '/privacy'],
    ];

    testCases.forEach(([input, expected], idx) => {
      it(`case ${idx + 1}: correctly normalizes "${input}" to "${expected}"`, () => {
        expect(normalizeRoutePath(input)).toBe(expected);
      });
    });
  });

  describe('isProfileComplete exhaustive permutations', () => {
    it('returns false when profile is undefined or null', () => {
      expect(isProfileComplete(undefined)).toBe(false);
      expect(isProfileComplete(null)).toBe(false);
    });

    it('returns false when full_name is missing or only whitespace', () => {
      expect(isProfileComplete({ full_name: '', stage_name: 'Metro', base_currency: 'USD' })).toBe(false);
      expect(isProfileComplete({ full_name: '   ', stage_name: 'Metro', base_currency: 'USD' })).toBe(false);
      expect(isProfileComplete({ full_name: null, stage_name: 'Metro', base_currency: 'USD' })).toBe(false);
      expect(isProfileComplete({ stage_name: 'Metro', base_currency: 'USD' } as any)).toBe(false);
    });

    it('returns false when stage_name is missing or only whitespace', () => {
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: '', base_currency: 'USD' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: ' \t\n ', base_currency: 'USD' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: null, base_currency: 'USD' })).toBe(false);
    });

    it('returns false when base_currency is missing or not in allowed list', () => {
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: '' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: null })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: 'GBP' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: 'JPY' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: 'CAD' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: 'AUD' })).toBe(false);
      expect(isProfileComplete({ full_name: 'Leland Wayne', stage_name: 'Metro', base_currency: 'CHF' })).toBe(false);
    });

    MANDATORY_PROFILE_CURRENCIES.forEach((curr) => {
      it(`accepts uppercase currency "${curr}" as valid`, () => {
        expect(isProfileComplete({
          full_name: 'Producer One',
          stage_name: 'BeatMaker',
          base_currency: curr,
        })).toBe(true);
      });

      it(`accepts lowercase currency "${curr.toLowerCase()}" after trimming/uppercasing`, () => {
        expect(isProfileComplete({
          full_name: 'Producer One',
          stage_name: 'BeatMaker',
          base_currency: `  ${curr.toLowerCase()}  `,
        })).toBe(true);
      });
    });

    it('treats address as strictly optional for completeness check', () => {
      expect(isProfileComplete({
        full_name: 'John Doe',
        stage_name: 'JD On The Beat',
        base_currency: 'USD',
        address: null,
      })).toBe(true);

      expect(isProfileComplete({
        full_name: 'John Doe',
        stage_name: 'JD On The Beat',
        base_currency: 'USD',
        address: '',
      })).toBe(true);

      expect(isProfileComplete({
        full_name: 'John Doe',
        stage_name: 'JD On The Beat',
        base_currency: 'USD',
        address: '123 Studio Blvd, Los Angeles, CA',
      })).toBe(true);
    });
  });

  describe('isStudioRoute and isProtectedRoute route classification', () => {
    PROTECTED_STUDIO_ROUTES.forEach((route) => {
      it(`classifies studio route "${route}" correctly`, () => {
        expect(isStudioRoute(route)).toBe(true);
        expect(isProtectedRoute(route)).toBe(true);
        expect(isPublicRoute(route)).toBe(false);
      });

      it(`classifies sub-route "${route}/sub-page" as studio route`, () => {
        expect(isStudioRoute(`${route}/sub-page`)).toBe(true);
        expect(isProtectedRoute(`${route}/sub-page`)).toBe(true);
      });

      it(`has a human-friendly name mapped in STUDIO_TOOL_NAMES for "${route}"`, () => {
        expect(STUDIO_TOOL_NAMES[route]).toBeDefined();
        expect(typeof STUDIO_TOOL_NAMES[route]).toBe('string');
        expect(STUDIO_TOOL_NAMES[route].length).toBeGreaterThan(0);
      });
    });

    PUBLIC_ROUTES.forEach((pubRoute) => {
      it(`classifies public route "${pubRoute}" as public and not studio`, () => {
        expect(isPublicRoute(pubRoute)).toBe(true);
        expect(isStudioRoute(pubRoute)).toBe(false);
      });
    });

    it('classifies /account as protected but not studio route', () => {
      expect(isAccountRoute('/account')).toBe(true);
      expect(isAccountRoute('/account/settings')).toBe(true);
      expect(isProtectedRoute('/account')).toBe(true);
      expect(isStudioRoute('/account')).toBe(false);
    });

    it('handles falsy or unknown paths safely', () => {
      expect(isStudioRoute(null)).toBe(false);
      expect(isStudioRoute(undefined)).toBe(false);
      expect(isStudioRoute('')).toBe(false);
      expect(isStudioRoute('/unknown-random-route')).toBe(false);

      expect(isAccountRoute(null)).toBe(false);
      expect(isAccountRoute(undefined)).toBe(false);
      expect(isAccountRoute('/random')).toBe(false);

      expect(isProtectedRoute(null)).toBe(false);
      expect(isProtectedRoute('/random-route')).toBe(false);

      expect(isPublicRoute(null)).toBe(false);
      expect(isPublicRoute('/secret-dashboard')).toBe(false);
    });
  });

  describe('calculateSubscriptionStatus boundary calculations', () => {
    it('returns exact lifetime state with infinite days', () => {
      const res = calculateSubscriptionStatus({ is_lifetime_paid: true });
      expect(res.isLifetime).toBe(true);
      expect(res.hasAccess).toBe(true);
      expect(res.isTrialActive).toBe(false);
      expect(res.isTrialExpired).toBe(false);
      expect(res.daysRemaining).toBe(Infinity);
      expect(res.hoursRemaining).toBe(Infinity);
    });

    it('calculates active trial with exactly 24 hours remaining', () => {
      const endsIn24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = calculateSubscriptionStatus({
        is_lifetime_paid: false,
        trial_ends_at: endsIn24h,
      });

      expect(res.isLifetime).toBe(false);
      expect(res.hasAccess).toBe(true);
      expect(res.isTrialActive).toBe(true);
      expect(res.isTrialExpired).toBe(false);
      expect(res.daysRemaining).toBe(1);
      expect(res.hoursRemaining).toBe(24);
    });

    it('calculates active trial with 3 hours remaining', () => {
      const endsIn3h = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      const res = calculateSubscriptionStatus({
        is_lifetime_paid: false,
        trial_ends_at: endsIn3h,
      });

      expect(res.hasAccess).toBe(true);
      expect(res.isTrialActive).toBe(true);
      expect(res.isTrialExpired).toBe(false);
      expect(res.daysRemaining).toBe(1);
      expect(res.hoursRemaining).toBe(3);
    });

    it('calculates expired trial when trial_ends_at was 1 second ago', () => {
      const justExpired = new Date(Date.now() - 1000).toISOString();
      const res = calculateSubscriptionStatus({
        is_lifetime_paid: false,
        trial_ends_at: justExpired,
      });

      expect(res.isLifetime).toBe(false);
      expect(res.hasAccess).toBe(false);
      expect(res.isTrialActive).toBe(false);
      expect(res.isTrialExpired).toBe(true);
      expect(res.daysRemaining).toBe(0);
      expect(res.hoursRemaining).toBe(0);
    });

    it('calculates expired trial when trial_ends_at was 48 hours ago', () => {
      const expiredPast = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const res = calculateSubscriptionStatus({
        is_lifetime_paid: false,
        trial_ends_at: expiredPast,
      });

      expect(res.hasAccess).toBe(false);
      expect(res.isTrialExpired).toBe(true);
      expect(res.daysRemaining).toBe(0);
      expect(res.hoursRemaining).toBe(0);
    });

    it('calculates trial end date from account created_at fallback if trial_ends_at is missing', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = calculateSubscriptionStatus(
        { is_lifetime_paid: false },
        yesterday
      );

      // Yesterday + 3 days = 2 days remaining from now
      expect(res.hasAccess).toBe(true);
      expect(res.isTrialActive).toBe(true);
      expect(res.daysRemaining).toBe(2);
      expect(res.hoursRemaining).toBeGreaterThanOrEqual(47);
    });

    it('handles created_at from 4 days ago as expired when no trial_ends_at is set', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      const res = calculateSubscriptionStatus(
        { is_lifetime_paid: false },
        fourDaysAgo
      );

      expect(res.hasAccess).toBe(false);
      expect(res.isTrialActive).toBe(false);
      expect(res.isTrialExpired).toBe(true);
      expect(res.daysRemaining).toBe(0);
      expect(res.hoursRemaining).toBe(0);
    });

    it('handles completely null profile and null fallback gracefully with a 3-day default', () => {
      const res = calculateSubscriptionStatus(null, null);

      expect(res.isLifetime).toBe(false);
      expect(res.hasAccess).toBe(true);
      expect(res.isTrialActive).toBe(true);
      expect(res.daysRemaining).toBe(3);
      expect(res.hoursRemaining).toBe(72);
    });

    it('handles non-date strings without throwing unhandled exceptions', () => {
      const res = calculateSubscriptionStatus(
        { trial_ends_at: 'NOT_A_DATE_STRING' },
        'INVALID_CREATED_AT'
      );

      expect(res).toBeDefined();
      expect(typeof res.hasAccess).toBe('boolean');
      expect(typeof res.daysRemaining).toBe('number');
      expect(isNaN(res.daysRemaining)).toBe(false);
      expect(isNaN(res.hoursRemaining)).toBe(false);
    });
  });
});
