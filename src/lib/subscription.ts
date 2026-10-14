export interface SubscriptionStatus {
  isLifetime: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  trialEndsAt: Date | null;
  hasAccess: boolean;
}

export const PROTECTED_STUDIO_ROUTES = [
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

export const STUDIO_TOOL_NAMES: Record<string, string> = {
  '/bity': 'Beat Catalog',
  '/crm': 'Placement CRM',
  '/licenses': 'License Generator',
  '/finanse': 'Finance Hub',
  '/mailer': 'Mail Tracker',
  '/leads': 'Lead Finder',
  '/publisher': 'Social Publisher',
  '/downloader': 'YT Downloader',
  '/validator': 'Email Validator',
};

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/terms',
  '/privacy',
  '/cookies',
  '/upgrade',
  '/checkout',
];

export const PROTECTED_ROUTES = [
  ...PROTECTED_STUDIO_ROUTES,
  '/account',
];

export const MANDATORY_PROFILE_CURRENCIES = ['USD', 'PLN', 'EUR', 'RUB', 'UAH'];

export function normalizeRoutePath(pathname?: string | null): string {
  if (!pathname) return '/';
  return (
    pathname
      .split('?')[0]
      .split('#')[0]
      .toLowerCase()
      .trim()
      .replace(/\/+$/, '') || '/'
  );
}

/**
 * Validates mandatory profile fields required before accessing studio modules:
 * full_name, stage_name (Producer Name), and base_currency.
 * address is optional.
 */
export function isProfileComplete(
  profile?: {
    full_name?: string | null;
    stage_name?: string | null;
    base_currency?: string | null;
    address?: string | null;
  } | null
): boolean {
  if (!profile) return false;
  const fullNameValid = Boolean(
    typeof profile.full_name === 'string' && profile.full_name.trim().length > 0
  );
  const stageNameValid = Boolean(
    typeof profile.stage_name === 'string' && profile.stage_name.trim().length > 0
  );
  const baseCurrencyValid = Boolean(
    typeof profile.base_currency === 'string' &&
    profile.base_currency.trim().length > 0 &&
    MANDATORY_PROFILE_CURRENCIES.includes(profile.base_currency.trim().toUpperCase())
  );
  return fullNameValid && stageNameValid && baseCurrencyValid;
}

export function isStudioRoute(pathname?: string | null): boolean {
  if (!pathname) return false;
  const normalized = normalizeRoutePath(pathname);
  return PROTECTED_STUDIO_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(route + '/')
  );
}

export function isAccountRoute(pathname?: string | null): boolean {
  if (!pathname) return false;
  const normalized = normalizeRoutePath(pathname);
  return normalized === '/account' || normalized.startsWith('/account/');
}

export function isProtectedRoute(pathname?: string | null): boolean {
  return isStudioRoute(pathname) || isAccountRoute(pathname);
}

export function isPublicRoute(pathname?: string | null): boolean {
  if (!pathname) return false;
  const normalized = normalizeRoutePath(pathname);
  return PUBLIC_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(route + '/')
  );
}

export function calculateSubscriptionStatus(
  profile?: {
    is_lifetime_paid?: boolean | string | number | null;
    trial_ends_at?: string | null;
    created_at?: string | null;
  } | null,
  fallbackCreatedAt?: string | null
): SubscriptionStatus {
  // If lifetime access has been unlocked
  const isLifetime =
    profile?.is_lifetime_paid === true ||
    profile?.is_lifetime_paid === 'true' ||
    profile?.is_lifetime_paid === 1;

  if (isLifetime) {
    return {
      isLifetime: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: Infinity,
      hoursRemaining: Infinity,
      trialEndsAt: null,
      hasAccess: true,
    };
  }

  // Calculate trial ending date (defaults to 3 days after creation)
  let trialEndsAt: Date;
  if (profile?.trial_ends_at && !isNaN(new Date(profile.trial_ends_at).getTime())) {
    trialEndsAt = new Date(profile.trial_ends_at);
  } else {
    const baseDate = profile?.created_at || fallbackCreatedAt;
    const created =
      baseDate && !isNaN(new Date(baseDate).getTime())
        ? new Date(baseDate).getTime()
        : Date.now();
    trialEndsAt = new Date(created + 3 * 24 * 60 * 60 * 1000);
  }

  const now = Date.now();
  const diffMs = trialEndsAt.getTime() - now;

  if (diffMs > 0) {
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const hoursRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return {
      isLifetime: false,
      isTrialActive: true,
      isTrialExpired: false,
      daysRemaining,
      hoursRemaining,
      trialEndsAt,
      hasAccess: true,
    };
  }

  return {
    isLifetime: false,
    isTrialActive: false,
    isTrialExpired: true,
    daysRemaining: 0,
    hoursRemaining: 0,
    trialEndsAt,
    hasAccess: false,
  };
}
