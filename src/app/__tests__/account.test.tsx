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

const mockUpsert = jest.fn().mockResolvedValue({ error: null });

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
      upsert: mockUpsert,
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
      expect(screen.getByTestId('tab-billing')).toBeInTheDocument();
    });

    // Switch to Plan & Billing tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-billing'));
    });

    expect(screen.getByRole('heading', { name: /Plan & Billing/i })).toBeInTheDocument();
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

    // Switch to Plan & Billing tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-billing'));
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

  it('allows user to switch between Profile & Studio tab and Plan & Billing tab', async () => {
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

    // Default tab is profile
    expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-billing')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Metro Boomin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Metro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Get Lifetime \(\$29\)/i })).not.toBeInTheDocument();

    // Click Billing tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-billing'));
    });

    expect(screen.getByTestId('panel-billing')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-profile')).not.toBeInTheDocument();

    // Click back to Profile tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-profile'));
    });

    expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-billing')).not.toBeInTheDocument();
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

  it('initializes active 3-day trial for brand new user with no profile row in database', async () => {
    const mockUser = {
      id: 'usr-first-time',
      email: 'firstlogin@beatlab.space',
      created_at: new Date().toISOString(),
      user_metadata: { full_name: 'New Producer' },
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    // Profile table returns null (no row found)
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    });

    await act(async () => {
      render(<AccountPage />);
    });

    // Default to Profile tab and show onboarding notice for new producer
    expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-notice')).toBeInTheDocument();

    // Switch to Billing tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-billing'));
    });

    // It MUST be an active 3-Day Free Trial, NOT expired!
    expect(screen.getByText(/3-Day Free Trial/i)).toBeInTheDocument();
    expect(screen.queryByText(/Trial Expired/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your 3-Day Free Trial Has Ended/i)).not.toBeInTheDocument();
  });

  it('displays welcoming onboarding notice on /account when profile fields are incomplete', async () => {
    const mockUser = {
      id: 'usr-incomplete',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    mockSingle.mockResolvedValue({
      data: {
        full_name: '',
        stage_name: '',
        address: '',
        base_currency: 'USD',
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-notice')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Welcome to BEATLAB! Complete your producer profile/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Completing your producer details.*is required to unlock/i)
    ).toBeInTheDocument();

    // Verify Address textarea is NOT marked as required
    const addressInput = screen.getByPlaceholderText(/e\.g\. 123 Music Lane/i);
    expect(addressInput).not.toBeRequired();
  });

  it('displays onboarding notice when base_currency is not in mandatory supported list', async () => {
    const mockUser = {
      id: 'usr-bad-curr',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        address: '',
        base_currency: 'GBP', // not supported by BEATLAB mandatory profile currencies
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-notice')).toBeInTheDocument();
    });
  });

  it('does not display onboarding notice when profile is already complete', async () => {
    const mockUser = {
      id: 'usr-complete',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        address: '', // empty address is valid
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
      expect(screen.getByDisplayValue('Metro Boomin')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('onboarding-notice')).not.toBeInTheDocument();
  });

  it('trims whitespace on profile save and dispatches beatlab:profile-updated event', async () => {
    const mockUser = {
      id: 'usr-save',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    mockSingle.mockResolvedValue({
      data: {
        full_name: '',
        stage_name: '',
        address: '',
        base_currency: 'USD',
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    const eventListener = jest.fn();
    window.addEventListener('beatlab:profile-updated', eventListener);

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    });

    // Fill in form with extra surrounding whitespace
    const fullNameInput = screen.getByPlaceholderText(/e\.g\. John Doe/i);
    const stageNameInput = screen.getByPlaceholderText(/e\.g\. Metro Boomin/i);

    fireEvent.change(fullNameInput, { target: { value: '   Metro Boomin   ' } });
    fireEvent.change(stageNameInput, { target: { value: '   Metro   ' } });

    const submitBtn = screen.getByRole('button', { name: /Save Settings/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Upsert should have been called with trimmed strings
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'usr-save',
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        base_currency: 'USD',
      })
    );

    // Event should have been dispatched with trimmed details
    expect(eventListener).toHaveBeenCalled();
    const eventDetail = eventListener.mock.calls[0][0].detail;
    expect(eventDetail).toEqual({
      full_name: 'Metro Boomin',
      stage_name: 'Metro',
      base_currency: 'USD',
    });

    window.removeEventListener('beatlab:profile-updated', eventListener);
  });

  it('blocks save and alerts user when mandatory fields are only whitespace', async () => {
    const mockUser = {
      id: 'usr-whitespace',
      email: 'producer@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        full_name: '',
        stage_name: '',
        address: '',
        base_currency: 'USD',
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('panel-profile')).toBeInTheDocument();
    });

    mockUpsert.mockClear();

    const fullNameInput = screen.getByPlaceholderText(/e\.g\. John Doe/i);
    fireEvent.change(fullNameInput, { target: { value: '    ' } });

    const submitBtn = screen.getByRole('button', { name: /Save Settings/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining('Please fill in all mandatory fields')
    );
    expect(mockUpsert).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('normalizes lowercase currency loaded from database into uppercase matching supported list', async () => {
    const mockUser = {
      id: 'usr-lower-curr',
      email: 'lower@beatlab.space',
      created_at: new Date().toISOString(),
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        address: '',
        base_currency: 'eur', // lowercase in DB
        is_lifetime_paid: true,
        trial_ends_at: null,
      },
      error: null,
    });

    await act(async () => {
      render(<AccountPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('EUR')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('onboarding-notice')).not.toBeInTheDocument();
  });
});
