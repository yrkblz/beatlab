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

export function calculateSubscriptionStatus(
  profile?: {
    is_lifetime_paid?: boolean | null;
    trial_ends_at?: string | null;
    created_at?: string | null;
  } | null,
  fallbackCreatedAt?: string | null
): SubscriptionStatus {
  // If lifetime access has been unlocked
  if (profile?.is_lifetime_paid) {
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
  if (profile?.trial_ends_at) {
    trialEndsAt = new Date(profile.trial_ends_at);
  } else {
    const baseDate = profile?.created_at || fallbackCreatedAt || new Date().toISOString();
    const created = new Date(baseDate).getTime();
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
