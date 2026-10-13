import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import AccountPage from '../account/page';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: mockSelect,
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('Account & Settings Page (/account)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('renders sign in screen for unauthenticated visitors in English', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<AccountPage />);
    });

    expect(screen.getByRole('heading', { name: /Welcome to BEATLAB/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it('renders Plan & Billing card with live countdown timer during active trial', async () => {
    const mockUser = {
      id: 'usr-trial',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5000).toISOString();
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Metro Producer',
        stage_name: 'Metro',
        address: '123 Studio Way',
        base_currency: 'USD',
        is_lifetime_paid: false,
        trial_ends_at: futureDate,
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Plan & Billing/i })).toBeInTheDocument();
    });

    expect(screen.getByText('3-Day Free Trial')).toBeInTheDocument();
    expect(screen.getByTestId('trial-countdown-timer')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('Seconds')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Get Lifetime Access \(\$29\)/i }).length).toBeGreaterThan(0);
  });

  it('renders Lifetime Member status when is_lifetime_paid is true', async () => {
    const mockUser = {
      id: 'usr-lifetime',
      email: 'vip@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    mockSingle.mockResolvedValue({
      data: {
        full_name: 'VIP Producer',
        stage_name: 'VIP',
        address: '456 Studio Blvd',
        base_currency: 'USD',
        is_lifetime_paid: true,
        trial_ends_at: null,
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Lifetime Member').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/BEATLAB Lifetime Access Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/\$29 Paid/i)).toBeInTheDocument();
    expect(screen.queryByTestId('trial-countdown-timer')).not.toBeInTheDocument();
  });

  it('renders Trial Expired status and displays modal popup when trial is expired', async () => {
    const mockUser = {
      id: 'usr-expired',
      email: 'expired@beatlab.space',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Expired User',
        stage_name: 'Ex',
        address: '789 Studio Ave',
        base_currency: 'USD',
        is_lifetime_paid: false,
        trial_ends_at: pastDate,
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Trial Expired').length).toBeGreaterThan(0);
    });

    // Modal popup is displayed
    expect(screen.getByTestId('trial-expired-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Get Lifetime Access Forever/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Get Lifetime Access for \$29/i).length).toBeGreaterThan(0);
  });

  it('allows user to switch between Plan & Billing tab and Profile & Studio tab', async () => {
    const mockUser = {
      id: 'usr-tabs',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        address: '123 Studio Way',
        base_currency: 'USD',
        is_lifetime_paid: true,
        trial_ends_at: null,
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-billing')).toBeInTheDocument();
      expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
    });

    // Default tab is billing when profile is complete
    expect(screen.getByTestId('panel-billing')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-profile')).not.toBeInTheDocument();

    // Click Profile tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-profile'));
    });

    expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-billing')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Metro Boomin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Metro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();

    // Click back to Billing tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-billing'));
    });

    expect(screen.getByTestId('panel-billing')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-profile')).not.toBeInTheDocument();
  });

  it('automatically opens Profile & Studio tab when required profile fields are incomplete', async () => {
    const mockUser = {
      id: 'usr-new',
      email: 'newbie@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    // Incomplete profile
    mockSingle.mockResolvedValue({
      data: {
        full_name: null,
        stage_name: null,
        address: null,
        base_currency: null,
        is_lifetime_paid: false,
        trial_ends_at: null,
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('panel-billing')).not.toBeInTheDocument();
  });
});
