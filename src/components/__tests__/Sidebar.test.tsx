import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({ select: mockSelect })),
  },
}));

describe('Sidebar component', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue('/');
    
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
  });

  it('does not render sidebar for unauthenticated visitors on root route (/)', async () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    let container: any = null;
    await act(async () => {
      const res = render(<Sidebar />);
      container = res.container;
    });

    expect(container?.firstChild).toBeNull();
    expect(screen.queryByText('BEATLAB')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('does not render sidebar skeleton during loading state on root route (/)', async () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    // Simulate pending getUser promise (loading state)
    (supabase.auth.getUser as jest.Mock).mockReturnValue(new Promise(() => {}));

    let container: any = null;
    await act(async () => {
      const res = render(<Sidebar />);
      container = res.container;
    });

    expect(container?.firstChild).toBeNull();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('renders the application title and navigation links when authenticated on /', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    (usePathname as jest.Mock).mockReturnValue('/');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Test Name',
        stage_name: 'Test',
        address: '123 Test St',
        base_currency: 'USD',
      },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    expect(screen.getByText('BEATLAB')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Plan & Billing/i })).not.toBeInTheDocument();
  });

  it('shows logged out state on inner studio routes when no user is present', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');
    await act(async () => {
      render(<Sidebar />);
    });
    expect(screen.getByText('Not logged in')).toBeInTheDocument();
    expect(screen.getByText('BEATLAB')).toBeInTheDocument();
  });

  it('shows user email when logged in and profile is valid', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    
    mockSingle.mockResolvedValue({ 
      data: { 
        full_name: 'Test Name', 
        stage_name: 'Test', 
        address: '123 Test St', 
        base_currency: 'USD' 
      }, 
      error: null 
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to /account if profile data is missing', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    
    // Simulate missing full_name
    mockSingle.mockResolvedValue({ 
      data: { 
        stage_name: 'Test', 
        address: '123 Test St', 
        base_currency: 'USD' 
      }, 
      error: null 
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/account');
    });
  });
  
  it('does not redirect if already on /account page', async () => {
    (usePathname as jest.Mock).mockReturnValue('/account');
    const mockUser = { id: 'user123', email: 'test@example.com' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    
    mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') });

    await act(async () => {
      render(<Sidebar />);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('updates state when auth state changes', async () => {
    // We capture the onAuthStateChange callback to call it manually
    let authCallback: any = null;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    let container: any = null;
    await act(async () => {
      const res = render(<Sidebar />);
      container = res.container;
    });

    // Initial state on '/' as guest is null (hidden sidebar)
    expect(container?.firstChild).toBeNull();

    // Trigger auth state change to logged in
    mockSingle.mockResolvedValue({ 
      data: { 
        full_name: 'Test Name', 
        stage_name: 'Test', 
        address: '123 Test St', 
        base_currency: 'USD' 
      }, 
      error: null 
    });

    await act(async () => {
      authCallback('SIGNED_IN', { user: { id: 'user123', email: 'auth@example.com' } });
    });

    await waitFor(() => {
      expect(screen.getByText('auth@example.com')).toBeInTheDocument();
      expect(screen.getByText('BEATLAB')).toBeInTheDocument();
    });
  });

  it('handles null data response from getUser gracefully', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: null, error: { message: 'No session' } });

    await act(async () => {
      render(<Sidebar />);
    });

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('handles rejected Promise from supabase.auth.getUser() gracefully without throwing', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');
    (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Connection failure'));

    await act(async () => {
      render(<Sidebar />);
    });

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('falls back to stage_name in avatar and label when user has no email', async () => {
    const mockUser = {
      id: 'user-no-email',
      email: '',
      user_metadata: { stage_name: 'Metro Boomin' },
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Leland Wayne',
        stage_name: 'Metro Boomin',
        address: '123 Studio Way',
        base_currency: 'USD',
      },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });

  it('does not trigger router.push after unmount even if profile check resolves with missing data', async () => {
    const mockUser = { id: 'user-slow', email: 'slow@example.com' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    let resolveProfile: any;
    mockSingle.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve;
        })
    );

    let component: any;
    await act(async () => {
      component = render(<Sidebar />);
    });

    // Unmount before profile resolution completes
    component.unmount();

    // Now resolve with missing profile data
    await act(async () => {
      resolveProfile({ data: null, error: new Error('Missing profile') });
    });

    // router.push should NOT have been called because component unmounted
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('safely unmounts when subscription is undefined', async () => {
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: undefined }
    });

    let component: any;
    await act(async () => {
      component = render(<Sidebar />);
    });

    expect(() => component.unmount()).not.toThrow();
  });

  it('falls back to full_name when user has whitespace email and missing stage_name', async () => {
    const mockUser = {
      id: 'user-whitespace-email',
      email: '   ',
      user_metadata: { full_name: 'Quincy Jones' },
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Quincy Jones',
        stage_name: 'Q',
        address: '456 Studio Blvd',
        base_currency: 'USD',
      },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(screen.getByText('Quincy Jones')).toBeInTheDocument();
      expect(screen.getByText('Q')).toBeInTheDocument();
    });
  });

  it('falls back to Producer and ? when user has whitespace email and whitespace names', async () => {
    const mockUser = {
      id: 'user-blank',
      email: '   ',
      user_metadata: { stage_name: '   ', full_name: '   ' },
    };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Valid Name',
        stage_name: 'Valid Stage',
        address: '123 Address',
        base_currency: 'USD',
      },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(screen.getByText('Producer')).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  it('re-verifies profile when switching from one authenticated user to another', async () => {
    let authCallback: any = null;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    // Initial User A
    const userA = { id: 'user-A', email: 'userA@test.com' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: userA } });
    mockSingle.mockResolvedValueOnce({
      data: { full_name: 'User A', stage_name: 'A', address: 'Addr A', base_currency: 'USD' },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(screen.getByText('userA@test.com')).toBeInTheDocument();
    });

    // User B signs in with missing profile data
    const userB = { id: 'user-B', email: 'userB@test.com' };
    mockSingle.mockResolvedValueOnce({
      data: { full_name: null, stage_name: null, address: null, base_currency: null },
      error: null,
    });

    await act(async () => {
      authCallback('SIGNED_IN', { user: userB });
    });

    await waitFor(() => {
      expect(screen.getByText('userB@test.com')).toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith('/account');
    });
  });

  it('hides sidebar when guest navigates from an inner page (/bity) to root (/)', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    let container: any = null;
    let rerenderFn: any;
    await act(async () => {
      const res = render(<Sidebar />);
      container = res.container;
      rerenderFn = res.rerender;
    });

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
    expect(screen.getByText('BEATLAB')).toBeInTheDocument();

    // Guest navigates to /
    (usePathname as jest.Mock).mockReturnValue('/');
    await act(async () => {
      rerenderFn(<Sidebar />);
    });

    expect(container?.firstChild).toBeNull();
    expect(screen.queryByText('BEATLAB')).not.toBeInTheDocument();
  });

  it('does not redirect to /account when user trial is expired, allowing StudioGuard paywall blocker to remain active on studio routes', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');
    const expiredUser = { id: 'usr-expired', email: 'expired@producer.io' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });

    // Incomplete profile BUT expired trial
    mockSingle.mockResolvedValue({
      data: {
        full_name: '',
        stage_name: '',
        address: '',
        base_currency: 'USD',
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() - 100000).toISOString(), // expired!
      },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(screen.getByText('expired@producer.io')).toBeInTheDocument();
    });

    // Sidebar MUST NOT push /account so user remains on /bity to see PaywallBlocker
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText(/Expired • Upgrade/i)).toBeInTheDocument();
  });

  it('re-verifies profile and updates state when beatlab:profile-updated event is dispatched', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');
    const mockUser = { id: 'usr-onboard', email: 'producer@beatlab.io' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    // Initially incomplete profile
    mockSingle.mockResolvedValueOnce({
      data: { full_name: '', stage_name: '', address: '', base_currency: 'USD' },
      error: null,
    });

    await act(async () => {
      render(<Sidebar />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/account');
    });

    mockPush.mockClear();

    // Now user saves profile on /account -> Supabase profile is now complete
    mockSingle.mockResolvedValueOnce({
      data: {
        full_name: 'Metro Boomin',
        stage_name: 'Metro',
        address: '123 Studio Way',
        base_currency: 'USD',
        is_lifetime_paid: true,
      },
      error: null,
    });

    // Event is dispatched
    await act(async () => {
      window.dispatchEvent(new CustomEvent('beatlab:profile-updated'));
    });

    await waitFor(() => {
      expect(screen.getByText('Lifetime Access')).toBeInTheDocument();
    });

    // Should NOT redirect to /account anymore
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('skips redirect logic when user is on /account with search query parameters like ?tab=profile', async () => {
    (usePathname as jest.Mock).mockReturnValue('/account?tab=profile');
    const mockUser = { id: 'usr-acct-tab', email: 'tab@producer.io' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({ data: null, error: new Error('Missing profile') });

    await act(async () => {
      render(<Sidebar />);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('suppresses rendering on standalone routes with query parameters like /login?next=/bity and /upgrade?plan=lifetime', async () => {
    const mockUser = { id: 'usr-query', email: 'query@producer.io' };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    for (const route of [
      '/login?next=%2Fbity',
      '/upgrade?plan=lifetime',
      '/checkout/success?session_id=cs_123',
    ]) {
      (usePathname as jest.Mock).mockReturnValue(route);
      let container: any = null;
      await act(async () => {
        const res = render(<Sidebar />);
        container = res.container;
      });
      expect(container?.firstChild).toBeNull();
    }
  });
});
