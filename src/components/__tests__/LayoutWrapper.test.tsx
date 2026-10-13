import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import LayoutWrapper from '../LayoutWrapper';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe('LayoutWrapper component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('renders children and applies p-0 for unauthenticated guest on root route (/)', async () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(
        <LayoutWrapper>
          <div data-testid="child-content">Landing Page Full Width</div>
        </LayoutWrapper>
      );
    });

    const main = screen.getByTestId('main-layout-wrapper');
    expect(main).toHaveClass('p-0');
    expect(main).not.toHaveClass('p-8');
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('applies p-8 for authenticated user on root route (/)', async () => {
    const mockUser = { id: 'u-auth-123', email: 'producer@beathelper.com' };
    (usePathname as jest.Mock).mockReturnValue('/');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    await act(async () => {
      render(
        <LayoutWrapper>
          <div data-testid="child-content">Dashboard Grid</div>
        </LayoutWrapper>
      );
    });

    await waitFor(() => {
      const main = screen.getByTestId('main-layout-wrapper');
      expect(main).toHaveClass('p-8');
      expect(main).not.toHaveClass('p-0');
    });
  });

  it('applies p-8 on standard application routes like /bity', async () => {
    (usePathname as jest.Mock).mockReturnValue('/bity');

    await act(async () => {
      render(
        <LayoutWrapper>
          <div>Beat Catalog Page</div>
        </LayoutWrapper>
      );
    });

    const main = screen.getByTestId('main-layout-wrapper');
    expect(main).toHaveClass('p-8');
  });

  it('applies p-0 on standalone full-width routes like /login and /terms', async () => {
    (usePathname as jest.Mock).mockReturnValue('/login');

    await act(async () => {
      render(
        <LayoutWrapper>
          <div>Login Page</div>
        </LayoutWrapper>
      );
    });

    const main = screen.getByTestId('main-layout-wrapper');
    expect(main).toHaveClass('p-0');
  });

  it('updates styling dynamically when auth state changes', async () => {
    let authCallback: any = null;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    (usePathname as jest.Mock).mockReturnValue('/');

    await act(async () => {
      render(
        <LayoutWrapper>
          <div>Dynamic App Content</div>
        </LayoutWrapper>
      );
    });

    const main = screen.getByTestId('main-layout-wrapper');
    expect(main).toHaveClass('p-0');

    // Simulate login
    await act(async () => {
      authCallback('SIGNED_IN', { user: { id: 'user-new', email: 'test@mail.com' } });
    });

    await waitFor(() => {
      expect(main).toHaveClass('p-8');
    });
  });

  it('switches from p-8 to p-0 when an unauthenticated guest navigates from /bity to /', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (usePathname as jest.Mock).mockReturnValue('/bity');

    const { rerender } = render(
      <LayoutWrapper>
        <div>Navigating Guest</div>
      </LayoutWrapper>
    );

    const main = screen.getByTestId('main-layout-wrapper');
    expect(main).toHaveClass('p-8');

    // Guest navigates to root /
    (usePathname as jest.Mock).mockReturnValue('/');
    rerender(
      <LayoutWrapper>
        <div>Navigating Guest</div>
      </LayoutWrapper>
    );

    expect(main).toHaveClass('p-0');
    expect(main).not.toHaveClass('p-8');
  });
});
