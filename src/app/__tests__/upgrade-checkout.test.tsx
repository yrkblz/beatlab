import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UpgradePage from '../upgrade/page';
import SuccessPage from '../checkout/success/page';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === 'mock') return 'true';
      if (key === 'user_id') return 'usr-buyer-99';
      return null;
    }),
  })),
}));

const mockProfile = {
  id: 'usr-123',
  is_lifetime_paid: false,
  trial_ends_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
};

const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Upgrade & Checkout Flow (/upgrade and /checkout/success)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
            })),
          })),
          update: mockUpdate,
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
        update: mockUpdate,
      };
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.space' } },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('UpgradePage (/upgrade)', () => {
    it('renders hero title and value proposition in English', async () => {
      await act(async () => {
        render(<UpgradePage />);
      });

      expect(screen.getByText(/Pay once\. Create without limits for life\./i)).toBeInTheDocument();
      expect(screen.getAllByText(/Zero recurring subscriptions/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Lifetime Deal • One-Time Payment/i)).toBeInTheDocument();
    });

    it('displays the one-time $29 price tag', async () => {
      await act(async () => {
        render(<UpgradePage />);
      });

      expect(screen.getAllByText(/\$29/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/one-time payment/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders all 9 core feature bullet points', async () => {
      await act(async () => {
        render(<UpgradePage />);
      });

      expect(screen.getByText(/Unlimited access to all 9 BEATLAB studio modules/i)).toBeInTheDocument();
      expect(screen.getByText(/Placement CRM/i)).toBeInTheDocument();
      expect(screen.getByText(/License Agreement Generator/i)).toBeInTheDocument();
      expect(screen.getByText(/Beat Catalog with audio player/i)).toBeInTheDocument();
      expect(screen.getByText(/Social Auto-Publisher for TikTok and Instagram/i)).toBeInTheDocument();
      expect(screen.getByText(/Lead Finder & Mail Tracker/i)).toBeInTheDocument();
      expect(screen.getByText(/Multi-currency financial hub/i)).toBeInTheDocument();
    });

    it('displays active trial remaining badge when trial is active', async () => {
      await act(async () => {
        render(<UpgradePage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/3-Day Free Trial/i)).toBeInTheDocument();
      });
    });

    it('displays trial expired badge when trial has expired', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                ...mockProfile,
                trial_ends_at: new Date(Date.now() - 100000).toISOString(),
              },
              error: null,
            }),
          })),
        })),
        update: mockUpdate,
      }));

      await act(async () => {
        render(<UpgradePage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Trial Expired – Unlock Lifetime Access/i)).toBeInTheDocument();
      });
    });

    it('initiates Stripe checkout session on button click', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/pay/test_session' }),
      });

      delete (window as any).location;
      (window as any).location = { href: '' };

      await act(async () => {
        render(<UpgradePage />);
      });

      const upgradeBtn = screen.getByRole('button', { name: /Get Lifetime Access/i });
      await act(async () => {
        fireEvent.click(upgradeBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr-123',
          userEmail: 'producer@beatlab.space',
        }),
      });

      expect(window.location.href).toBe('https://checkout.stripe.com/pay/test_session');
    });

    it('redirects unauthenticated visitor to login on click', async () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

      await act(async () => {
        render(<UpgradePage />);
      });

      const upgradeBtn = screen.getByRole('button', { name: /Get Lifetime Access/i });
      fireEvent.click(upgradeBtn);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('SuccessPage (/checkout/success)', () => {
    it('renders lifetime activation confirmation message', async () => {
      await act(async () => {
        render(<SuccessPage />);
      });

      expect(screen.getByRole('heading', { name: /Welcome to the BEATLAB Club!/i })).toBeInTheDocument();
      expect(screen.getByText(/Lifetime Access Activated/i)).toBeInTheDocument();
      expect(screen.getByText(/Your one-time \$29 payment has been processed successfully/i)).toBeInTheDocument();
    });

    it('renders test mode banner when mock query parameter is true', async () => {
      await act(async () => {
        render(<SuccessPage />);
      });

      expect(screen.getByText(/Test Mode:/i)).toBeInTheDocument();
    });

    it('updates Supabase profile with is_lifetime_paid: true', async () => {
      await act(async () => {
        render(<SuccessPage />);
      });

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            is_lifetime_paid: true,
          })
        );
      });
    });

    it('renders link button to Studio Dashboard', async () => {
      await act(async () => {
        render(<SuccessPage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Go to Studio Dashboard/i })).toBeInTheDocument();
      });
      const link = screen.getByRole('link', { name: /Go to Studio Dashboard/i });
      expect(link).toHaveAttribute('href', '/');
    });
  });
});
