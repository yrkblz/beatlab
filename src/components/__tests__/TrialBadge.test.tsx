import React from 'react';
import { render, screen } from '@testing-library/react';
import TrialBadge from '../TrialBadge';

describe('TrialBadge Component', () => {
  it('renders nothing when user is not logged in', () => {
    const { container } = render(
      <TrialBadge
        status={{
          isLifetime: false,
          isTrialActive: true,
          isTrialExpired: false,
          daysRemaining: 3,
          hoursRemaining: 72,
          trialEndsAt: new Date(),
          hasAccess: true,
        }}
        isLoggedIn={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders Lifetime Member when isLifetime is true', () => {
    render(
      <TrialBadge
        status={{
          isLifetime: true,
          isTrialActive: false,
          isTrialExpired: false,
          daysRemaining: Infinity,
          hoursRemaining: Infinity,
          trialEndsAt: null,
          hasAccess: true,
        }}
        isLoggedIn={true}
      />
    );

    expect(screen.getByText('Lifetime Member')).toBeInTheDocument();
  });

  it('renders Demo Free badge with days remaining and upgrade button during active trial', () => {
    render(
      <TrialBadge
        status={{
          isLifetime: false,
          isTrialActive: true,
          isTrialExpired: false,
          daysRemaining: 2,
          hoursRemaining: 48,
          trialEndsAt: new Date(),
          hasAccess: true,
        }}
        isLoggedIn={true}
      />
    );

    expect(screen.getByText('Demo Free')).toBeInTheDocument();
    expect(screen.getByText(/2 dni/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kup dożywotnio \$29/i })).toHaveAttribute(
      'href',
      '/upgrade'
    );
  });

  it('renders Demo wygasło warning when trial is expired', () => {
    render(
      <TrialBadge
        status={{
          isLifetime: false,
          isTrialActive: false,
          isTrialExpired: true,
          daysRemaining: 0,
          hoursRemaining: 0,
          trialEndsAt: new Date(),
          hasAccess: false,
        }}
        isLoggedIn={true}
      />
    );

    expect(screen.getByText('Demo wygasło')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Odblokuj za \$29/i })).toHaveAttribute(
      'href',
      '/upgrade'
    );
  });
});
