import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import StudioGuard from '../StudioGuard';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';

const mockPush = jest.fn();
const mockReplace = jest.fn();

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
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

describe('StudioGuard Component (Route Protection & Paywall Gating)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('R1. Authentication Gate for Studio Routes & /account', () => {
    it.each([
      ['/bity'],
      ['/crm'],
      ['/licenses'],
      ['/finanse'],
      ['/mailer'],
      ['/leads'],
      ['/publisher'],
      ['/downloader'],
      ['/validator'],
    ])('redirects unauthenticated guest from studio route %s to /login?next=<path>', async (route) => {
      (usePathname as jest.Mock).mockReturnValue(route);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="protected-tool">Secret Studio Tool Content</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(route)}`);
      });

      // Under no circumstances can protected content be rendered for unauthenticated guests
      expect(screen.queryByTestId('protected-tool')).not.toBeInTheDocument();
      expect(screen.getByTestId('studio-guard-redirecting')).toBeInTheDocument();
    });

    it('redirects unauthenticated guest from /account to /login?next=%2Faccount', async () => {
      (usePathname as jest.Mock).mockReturnValue('/account');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="account-page">Account Page Content</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Faccount');
      });

      expect(screen.queryByTestId('account-page')).not.toBeInTheDocument();
    });

    it('preserves search query parameters and hash anchors when redirecting unauthenticated guest to /login', async () => {
      (usePathname as jest.Mock).mockReturnValue('/licenses');
      delete (window as any).location;
      (window as any).location = new URL('http://localhost:3000/licenses?template=exclusive&price=500#preview');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="licenses-content">Licenses Page</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          `/login?next=${encodeURIComponent('/licenses?template=exclusive&price=500#preview')}`
        );
      });

      (window as any).location = new URL('http://localhost:3000/');
    });

    it.each([
      ['/'],
      ['/login'],
      ['/terms'],
      ['/privacy'],
      ['/cookies'],
      ['/upgrade'],
      ['/checkout'],
      ['/checkout/success'],
    ])('allows public access to %s without auth redirect or paywall', async (publicRoute) => {
      (usePathname as jest.Mock).mockReturnValue(publicRoute);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="public-content">Public Page Body</div>
          </StudioGuard>
        );
      });

      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByTestId('public-content')).toBeInTheDocument();
      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();
    });
  });

  describe('R2. Mandatory Profile Onboarding on First Login', () => {
    const mockUser = {
      id: 'usr-new-producer',
      email: 'new@producer.io',
      created_at: new Date().toISOString(),
    };

    it('redirects user with incomplete profile from /bity to /account?tab=profile', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: '', // incomplete!
          stage_name: 'Metro',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/account?tab=profile');
      });

      expect(screen.queryByTestId('bity-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('studio-guard-onboarding-redirect')).toBeInTheDocument();
    });

    it('redirects user missing stage_name to /account?tab=profile', async () => {
      (usePathname as jest.Mock).mockReturnValue('/crm');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'John Doe',
          stage_name: null, // missing stage name!
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="crm-content">CRM Pipeline</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/account?tab=profile');
      });

      expect(screen.queryByTestId('crm-content')).not.toBeInTheDocument();
    });

    it('redirects user with no profile record in database to /account?tab=profile', async () => {
      (usePathname as jest.Mock).mockReturnValue('/finanse');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="finanse-content">Finance Hub</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/account?tab=profile');
      });

      expect(screen.queryByTestId('finanse-content')).not.toBeInTheDocument();
    });

    it('allows access to /account even when profile is incomplete (so user can complete onboarding)', async () => {
      (usePathname as jest.Mock).mockReturnValue('/account');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="account-page">Account & Onboarding Settings</div>
          </StudioGuard>
        );
      });

      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.getByTestId('account-page')).toBeInTheDocument();
    });

    it('considers address optional: unlocks studio when full_name, stage_name, and base_currency are set', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Metro Boomin',
          stage_name: 'Metro',
          base_currency: 'USD',
          address: '', // empty address is allowed!
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('bity-content')).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('immediately unlocks studio access when beatlab:profile-updated event is dispatched from /account', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
      // Initially incomplete profile
      mockSingle.mockResolvedValue({
        data: {
          full_name: '',
          stage_name: '',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog</div>
          </StudioGuard>
        );
      });

      // Initially redirects to onboarding
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/account?tab=profile');
      });

      mockReplace.mockClear();

      // Now user saves profile on /account which fires beatlab:profile-updated
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('beatlab:profile-updated', {
            detail: {
              full_name: 'Metro Boomin',
              stage_name: 'Metro',
              base_currency: 'USD',
            },
          })
        );
      });

      // Studio content is now unlocked!
      expect(screen.getByTestId('bity-content')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('R3. Strict 100% Hard Paywall Block After 3-Day Free Trial', () => {
    const expiredUser = {
      id: 'usr-expired-producer',
      email: 'expired@producer.io',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    };

    it('hard-blocks expired trial user on studio tools and renders PaywallBlocker with tool name', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Producer One',
          stage_name: 'P1',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() - 100000).toISOString(), // expired trial!
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog Active UI</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      });

      // 100% hard block: tool content is not in document
      expect(screen.queryByTestId('bity-content')).not.toBeInTheDocument();
      expect(screen.getByText(/3-Day Free Trial Expired/i)).toBeInTheDocument();
      expect(screen.getByText(/Beat Catalog/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Get Lifetime Access \(\$29\)/i })).toHaveAttribute(
        'href',
        '/upgrade'
      );
    });

    it('blocks expired user on all 9 studio routes', async () => {
      const routes = [
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

      for (const route of routes) {
        (usePathname as jest.Mock).mockReturnValue(route);
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
        mockSingle.mockResolvedValue({
          data: {
            full_name: 'Producer One',
            stage_name: 'P1',
            base_currency: 'USD',
            is_lifetime_paid: false,
            trial_ends_at: new Date(Date.now() - 50000).toISOString(),
          },
          error: null,
        });

        let unmount: () => void = () => {};
        await act(async () => {
          const rendered = render(
            <StudioGuard>
              <div data-testid="studio-tool-content">Secret UI</div>
            </StudioGuard>
          );
          unmount = rendered.unmount;
        });

        await waitFor(() => {
          expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('studio-tool-content')).not.toBeInTheDocument();
        unmount();
      }
    });

    it('allows full access for users with active 3-day free trial', async () => {
      const activeTrialUser = {
        id: 'usr-active-trial',
        email: 'active@producer.io',
        created_at: new Date().toISOString(),
      };

      (usePathname as jest.Mock).mockReturnValue('/crm');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: activeTrialUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Active Producer',
          stage_name: 'AP',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="crm-content">Active CRM Content</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('crm-content')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();
    });

    it('allows full access for lifetime pass members ($29 paid) even after 3-day duration', async () => {
      const lifetimeUser = {
        id: 'usr-lifetime-vip',
        email: 'vip@producer.io',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      (usePathname as jest.Mock).mockReturnValue('/licenses');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: lifetimeUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'VIP Producer',
          stage_name: 'VIP',
          base_currency: 'EUR',
          is_lifetime_paid: true,
          trial_ends_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="licenses-content">License Generator Active Content</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('licenses-content')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();
    });

    it('prioritizes hard paywall block over onboarding redirect when user trial is expired and profile is incomplete', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: '', // incomplete!
          stage_name: null, // incomplete!
          base_currency: '', // incomplete!
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() - 50000).toISOString(), // expired!
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      });

      // Must NOT redirect to onboarding when trial is expired
      expect(mockReplace).not.toHaveBeenCalledWith('/account?tab=profile');
      expect(screen.queryByTestId('studio-guard-onboarding-redirect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bity-content')).not.toBeInTheDocument();
    });

    it('correctly resolves tool name on nested studio subroutes like /crm/client-123', async () => {
      (usePathname as jest.Mock).mockReturnValue('/crm/client-123');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Metro Boomin',
          stage_name: 'Metro',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() - 50000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="crm-detail">CRM Client Detail</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      });

      expect(screen.getByText('Placement CRM')).toBeInTheDocument();
      expect(screen.queryByTestId('crm-detail')).not.toBeInTheDocument();
    });

    it('dynamically triggers PaywallBlocker when active trial expires live', async () => {
      jest.useFakeTimers();
      const userExpiringSoon = {
        id: 'usr-soon',
        email: 'soon@producer.io',
        created_at: new Date().toISOString(),
      };

      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: userExpiringSoon } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Metro Boomin',
          stage_name: 'Metro',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 5000).toISOString(), // expires in 5s
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-live">Beat Catalog Live</div>
          </StudioGuard>
        );
      });

      // Active trial initially
      expect(screen.getByTestId('bity-live')).toBeInTheDocument();
      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();

      // Fast-forward time past trial expiration
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // PaywallBlocker now takes over immediately
      expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      expect(screen.queryByTestId('bity-live')).not.toBeInTheDocument();

      jest.useRealTimers();
    });

    it('renders PaywallBlocker with correct toolName on studio routes with search params and hash anchors', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      delete (window as any).location;
      (window as any).location = new URL('http://localhost:3000/bity?genre=trap#player');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Metro Boomin',
          stage_name: 'Metro',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() - 50000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-query-content">Beat Catalog Content</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      });

      expect(screen.getByText('Beat Catalog')).toBeInTheDocument();
      expect(screen.queryByTestId('bity-query-content')).not.toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();

      (window as any).location = new URL('http://localhost:3000/');
    });

    it('immediately unlocks studio access when checkout/success activates lifetime pass via beatlab:profile-updated event', async () => {
      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
      // Initially expired trial
      mockSingle.mockResolvedValue({
        data: {
          full_name: 'Metro Boomin',
          stage_name: 'Metro',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() - 50000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog UI</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      });

      // User purchases lifetime pass and checkout/success fires event
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('beatlab:profile-updated', {
            detail: { is_lifetime_paid: true },
          })
        );
      });

      // Studio content is now unlocked!
      expect(screen.getByTestId('bity-content')).toBeInTheDocument();
      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();
    });

    it('resets profile and re-evaluates access when switching from an expired user to an active trial user', async () => {
      let authCallback: any = null;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((cb) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      (usePathname as jest.Mock).mockReturnValue('/bity');
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: expiredUser } });
      mockSingle.mockResolvedValueOnce({
        data: {
          full_name: 'Expired User',
          stage_name: 'EU',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() - 50000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        render(
          <StudioGuard>
            <div data-testid="bity-content">Beat Catalog UI</div>
          </StudioGuard>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
      });

      // Switch to new user with active trial
      const newActiveUser = {
        id: 'usr-new-active',
        email: 'new@active.io',
        created_at: new Date().toISOString(),
      };
      mockSingle.mockResolvedValueOnce({
        data: {
          full_name: 'New Active User',
          stage_name: 'NAU',
          base_currency: 'USD',
          is_lifetime_paid: false,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      await act(async () => {
        authCallback('SIGNED_IN', { user: newActiveUser });
      });

      await waitFor(() => {
        expect(screen.getByTestId('bity-content')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();
    });
  });
});
