import { calculateSubscriptionStatus } from '../subscription';

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
});
