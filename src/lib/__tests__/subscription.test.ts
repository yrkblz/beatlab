import {
  calculateSubscriptionStatus,
  isProfileComplete,
  isStudioRoute,
  isAccountRoute,
  isProtectedRoute,
  isPublicRoute,
  normalizeRoutePath,
  PROTECTED_STUDIO_ROUTES,
} from '../subscription';

describe('calculateSubscriptionStatus', () => {
  it('returns lifetime access when is_lifetime_paid is true', () => {
    const status = calculateSubscriptionStatus({
      is_lifetime_paid: true,
      trial_ends_at: new Date(Date.now() - 100000).toISOString(),
    });

    expect(status.isLifetime).toBe(true);
    expect(status.hasAccess).toBe(true);
    expect(status.isTrialActive).toBe(false);
    expect(status.isTrialExpired).toBe(false);
    expect(status.daysRemaining).toBe(Infinity);
  });

  it('recognizes truthy string "true" and number 1 as lifetime access, and rejects string "false"', () => {
    const statusStringTrue = calculateSubscriptionStatus({
      is_lifetime_paid: 'true' as any,
    });
    expect(statusStringTrue.isLifetime).toBe(true);
    expect(statusStringTrue.hasAccess).toBe(true);

    const statusNumOne = calculateSubscriptionStatus({
      is_lifetime_paid: 1 as any,
    });
    expect(statusNumOne.isLifetime).toBe(true);
    expect(statusNumOne.hasAccess).toBe(true);

    const statusStringFalse = calculateSubscriptionStatus({
      is_lifetime_paid: 'false' as any,
      trial_ends_at: new Date(Date.now() - 50000).toISOString(),
    });
    expect(statusStringFalse.isLifetime).toBe(false);
    expect(statusStringFalse.isTrialExpired).toBe(true);
    expect(statusStringFalse.hasAccess).toBe(false);
  });

  it('returns active trial when trial_ends_at is in the future', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const status = calculateSubscriptionStatus({
      is_lifetime_paid: false,
      trial_ends_at: futureDate,
    });

    expect(status.isLifetime).toBe(false);
    expect(status.hasAccess).toBe(true);
    expect(status.isTrialActive).toBe(true);
    expect(status.isTrialExpired).toBe(false);
    expect(status.daysRemaining).toBeGreaterThanOrEqual(1);
  });

  it('returns expired trial when trial_ends_at is in the past and not paid', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const status = calculateSubscriptionStatus({
      is_lifetime_paid: false,
      trial_ends_at: pastDate,
    });

    expect(status.isLifetime).toBe(false);
    expect(status.hasAccess).toBe(false);
    expect(status.isTrialActive).toBe(false);
    expect(status.isTrialExpired).toBe(true);
    expect(status.daysRemaining).toBe(0);
  });

  it('defaults to 3-day trial from created_at date when trial_ends_at is missing', () => {
    const justNow = new Date().toISOString();
    const status = calculateSubscriptionStatus(
      {
        is_lifetime_paid: false,
        created_at: justNow,
      },
      justNow
    );

    expect(status.hasAccess).toBe(true);
    expect(status.isTrialActive).toBe(true);
    expect(status.daysRemaining).toBe(3);
  });

  it('handles invalid or corrupted date strings gracefully without returning NaN', () => {
    const status = calculateSubscriptionStatus(
      {
        is_lifetime_paid: false,
        trial_ends_at: 'not-a-valid-date',
      },
      'also-invalid'
    );

    expect(status.hasAccess).toBe(true);
    expect(status.isTrialActive).toBe(true);
    expect(Number.isNaN(status.daysRemaining)).toBe(false);
    expect(status.daysRemaining).toBe(3);
    expect(status.trialEndsAt instanceof Date).toBe(true);
    expect(Number.isNaN(status.trialEndsAt?.getTime())).toBe(false);
  });
});

describe('isProfileComplete (Producer Onboarding Validation)', () => {
  it('returns true when full_name, stage_name, and supported base_currency are present (address optional)', () => {
    expect(
      isProfileComplete({
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        base_currency: 'USD',
        // address omitted
      })
    ).toBe(true);

    expect(
      isProfileComplete({
        full_name: 'Leland Wayne',
        stage_name: 'Metro',
        base_currency: 'PLN',
        address: '', // empty address is valid
      })
    ).toBe(true);
  });

  it('supports all mandatory currencies (USD, PLN, EUR, RUB, UAH) case-insensitively and with whitespace', () => {
    const currencies = ['USD', 'PLN', 'EUR', 'RUB', 'UAH'];
    currencies.forEach((cur) => {
      expect(
        isProfileComplete({
          full_name: 'Producer Name',
          stage_name: 'Producer',
          base_currency: cur,
        })
      ).toBe(true);
      // lowercase
      expect(
        isProfileComplete({
          full_name: 'Producer Name',
          stage_name: 'Producer',
          base_currency: cur.toLowerCase(),
        })
      ).toBe(true);
      // with whitespace
      expect(
        isProfileComplete({
          full_name: 'Producer Name',
          stage_name: 'Producer',
          base_currency: `  ${cur}  `,
        })
      ).toBe(true);
    });
  });

  it('returns false when full_name is missing or empty', () => {
    expect(
      isProfileComplete({
        full_name: '',
        stage_name: 'Producer',
        base_currency: 'USD',
      })
    ).toBe(false);

    expect(
      isProfileComplete({
        full_name: '   ',
        stage_name: 'Producer',
        base_currency: 'USD',
      })
    ).toBe(false);

    expect(
      isProfileComplete({
        full_name: null,
        stage_name: 'Producer',
        base_currency: 'USD',
      })
    ).toBe(false);
  });

  it('returns false when stage_name is missing or empty', () => {
    expect(
      isProfileComplete({
        full_name: 'Legal Name',
        stage_name: '',
        base_currency: 'USD',
      })
    ).toBe(false);

    expect(
      isProfileComplete({
        full_name: 'Legal Name',
        stage_name: null,
        base_currency: 'USD',
      })
    ).toBe(false);
  });

  it('returns false when base_currency is missing or invalid', () => {
    expect(
      isProfileComplete({
        full_name: 'Legal Name',
        stage_name: 'Stage Name',
        base_currency: '',
      })
    ).toBe(false);

    expect(
      isProfileComplete({
        full_name: 'Legal Name',
        stage_name: 'Stage Name',
        base_currency: 'GBP', // unsupported currency
      })
    ).toBe(false);
  });

  it('safely handles non-string inputs for profile fields without throwing', () => {
    expect(
      isProfileComplete({
        full_name: 123 as any,
        stage_name: 'Metro',
        base_currency: 'USD',
      })
    ).toBe(false);

    expect(
      isProfileComplete({
        full_name: 'Metro Boomin',
        stage_name: {} as any,
        base_currency: 'USD',
      })
    ).toBe(false);

    expect(
      isProfileComplete({
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        base_currency: true as any,
      })
    ).toBe(false);
  });

  it('returns false for null or undefined profile', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });
});

describe('normalizeRoutePath Helper', () => {
  it('strips query parameters, hash anchors, trailing slashes and normalizes case', () => {
    expect(normalizeRoutePath('/bity?tab=presets')).toBe('/bity');
    expect(normalizeRoutePath('/crm#kanban')).toBe('/crm');
    expect(normalizeRoutePath('/licenses?template=exclusive&price=500#preview')).toBe('/licenses');
    expect(normalizeRoutePath('/ACCOUNT/')).toBe('/account');
    expect(normalizeRoutePath('/')).toBe('/');
    expect(normalizeRoutePath('')).toBe('/');
    expect(normalizeRoutePath(null)).toBe('/');
    expect(normalizeRoutePath(undefined)).toBe('/');
  });
});

describe('Route Classification Helpers', () => {
  it('correctly identifies all 9 protected studio routes', () => {
    const expectedRoutes = [
      '/bity',
      '/crm',
      '/licenses',
      '/finanse',
      '/mailer',
      '/leads',
      '/publisher',
      '/downloader',
      '/validator',
    ];

    expect(PROTECTED_STUDIO_ROUTES).toEqual(expectedRoutes);

    expectedRoutes.forEach((route) => {
      expect(isStudioRoute(route)).toBe(true);
      expect(isStudioRoute(`${route}/`)).toBe(true);
      expect(isStudioRoute(route.toUpperCase())).toBe(true);
      expect(isProtectedRoute(route)).toBe(true);
      expect(isPublicRoute(route)).toBe(false);
    });
  });

  it('correctly identifies studio routes even when query parameters or hash anchors are attached', () => {
    expect(isStudioRoute('/bity?tab=presets')).toBe(true);
    expect(isStudioRoute('/crm#board')).toBe(true);
    expect(isStudioRoute('/licenses?template=exclusive#preview')).toBe(true);
    expect(isStudioRoute('/finanse?currency=USD')).toBe(true);
    expect(isStudioRoute('/crm/client-123?sort=desc#notes')).toBe(true);
    expect(isProtectedRoute('/bity?tab=presets')).toBe(true);
  });

  it('correctly identifies /account as protected but not a studio tool, including with query parameters and hash anchors', () => {
    expect(isAccountRoute('/account')).toBe(true);
    expect(isAccountRoute('/account/')).toBe(true);
    expect(isAccountRoute('/account?tab=profile')).toBe(true);
    expect(isAccountRoute('/account?tab=billing#invoices')).toBe(true);
    expect(isStudioRoute('/account')).toBe(false);
    expect(isStudioRoute('/account?tab=profile')).toBe(false);
    expect(isProtectedRoute('/account')).toBe(true);
    expect(isProtectedRoute('/account?tab=profile')).toBe(true);
    expect(isPublicRoute('/account')).toBe(false);
    expect(isPublicRoute('/account?tab=profile')).toBe(false);
  });

  it('correctly identifies public routes, including with query parameters and hash anchors', () => {
    const publicRoutes = [
      '/',
      '/login',
      '/terms',
      '/privacy',
      '/cookies',
      '/upgrade',
      '/checkout',
      '/checkout/success',
    ];

    publicRoutes.forEach((route) => {
      expect(isPublicRoute(route)).toBe(true);
      expect(isStudioRoute(route)).toBe(false);
      expect(isProtectedRoute(route)).toBe(false);
    });

    // Query & hash variations on public routes
    expect(isPublicRoute('/login?next=%2Fbity')).toBe(true);
    expect(isPublicRoute('/upgrade?plan=lifetime')).toBe(true);
    expect(isPublicRoute('/checkout/success?session_id=cs_123&user_id=usr_1')).toBe(true);
    expect(isPublicRoute('/terms?lang=en#intellectual-property')).toBe(true);
    expect(isPublicRoute('/privacy#gdpr')).toBe(true);
    expect(isPublicRoute('/cookies#manage')).toBe(true);
  });
});
