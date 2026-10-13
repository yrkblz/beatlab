import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import TermsPage, { metadata as termsMetadata } from '../terms/page';
import PrivacyPage, { metadata as privacyMetadata } from '../privacy/page';
import CookiesPage, { metadata as cookiesMetadata } from '../cookies/page';
import LoginPage from '../login/page';
import AccountPage from '../account/page';
import Home, { Dashboard } from '../page';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

describe('Legal Compliance Pages and Footer Links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Terms of Service (/terms)', () => {
    it('exports metadata for SEO and compliance', () => {
      expect(termsMetadata.title).toContain('Terms of Service');
      expect(termsMetadata.description).toBeDefined();
    });

    it('renders the Terms of Service page with required sections and legal text', () => {
      render(<TermsPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Terms of Service/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /1\. Agreement to Terms/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /4\. Producer Intellectual Property & Music Ownership/i })).toBeInTheDocument();
      expect(screen.getByText(/Producer Rights Guarantee/i)).toBeInTheDocument();
      expect(screen.getByText(/You retain 100% full, exclusive ownership of all intellectual property/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /5\. Beat License Generation & Legal Disclaimers/i })).toBeInTheDocument();
      expect(screen.getByText(/BeatHelper is a software provider and not a law firm/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /13\. Contact Information/i })).toBeInTheDocument();
      expect(screen.getAllByText(/beatlab\.space@gmail\.com/i).length).toBeGreaterThan(0);
    });

    it('renders navigation tabs and back to home link', () => {
      render(<TermsPage />);

      expect(screen.getByRole('link', { name: /Back to Home/i })).toHaveAttribute('href', '/');
      const nav = screen.getByRole('navigation', { name: /Legal document navigation/i });
      expect(within(nav).getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('aria-current', 'page');
      expect(within(nav).getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
      expect(within(nav).getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('href', '/cookies');

      const mobileNav = screen.getByRole('navigation', { name: /Mobile legal tabs/i });
      expect(within(mobileNav).getByRole('link', { name: /^Terms$/i })).toHaveAttribute('aria-current', 'page');
      expect(within(mobileNav).getByRole('link', { name: /Privacy/i })).toHaveAttribute('href', '/privacy');
      expect(within(mobileNav).getByRole('link', { name: /Cookies/i })).toHaveAttribute('href', '/cookies');
    });
  });

  describe('Privacy Policy (/privacy)', () => {
    it('exports metadata for SEO and API portal compliance', () => {
      expect(privacyMetadata.title).toContain('Privacy Policy');
      expect(privacyMetadata.description).toBeDefined();
    });

    it('renders the Privacy Policy page with Google Limited Use disclosure and GDPR rights', () => {
      render(<PrivacyPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /2\. Information We Collect/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /3\. Google API Services User Data Policy Compliance/i })).toBeInTheDocument();
      expect(screen.getByText(/Google Limited Use Disclosure/i)).toBeInTheDocument();
      expect(screen.getByText(/We do NOT use Google user data to train generalized artificial intelligence/i)).toBeInTheDocument();
      expect(screen.getAllByText(/beatlab\.space@gmail\.com/i).length).toBeGreaterThan(0);
    });

    it('renders navigation tabs pointing to other legal routes', () => {
      render(<PrivacyPage />);

      const nav = screen.getByRole('navigation', { name: /Legal document navigation/i });
      expect(within(nav).getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('aria-current', 'page');
      expect(within(nav).getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('href', '/terms');
      expect(within(nav).getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('href', '/cookies');

      const mobileNav = screen.getByRole('navigation', { name: /Mobile legal tabs/i });
      expect(within(mobileNav).getByRole('link', { name: /^Privacy$/i })).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Cookie Policy (/cookies)', () => {
    it('exports metadata for SEO and compliance', () => {
      expect(cookiesMetadata.title).toContain('Cookie Policy');
      expect(cookiesMetadata.description).toBeDefined();
    });

    it('renders Cookie Policy with cookie table and management guides', () => {
      render(<CookiesPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Cookie Policy/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /1\. What Are Cookies and Local Storage\?/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /3\. Detailed Cookie & Storage Inventory/i })).toBeInTheDocument();
      expect(screen.getByText('sb-*-auth-token')).toBeInTheDocument();
      expect(screen.getByText('beathelper_cookie_consent')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /4\. Managing and Disabling Cookies/i })).toBeInTheDocument();

      const nav = screen.getByRole('navigation', { name: /Legal document navigation/i });
      expect(within(nav).getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('aria-current', 'page');

      const mobileNav = screen.getByRole('navigation', { name: /Mobile legal tabs/i });
      expect(within(mobileNav).getByRole('link', { name: /^Cookies$/i })).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Footer Navigation Links and Standalone Compliance', () => {
    it('renders visible and functioning links to /terms, /privacy, and /cookies in landing page footer', () => {
      render(<Home />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();

      const termsLink = within(footer).getByRole('link', { name: /Terms of Service/i });
      expect(termsLink).toHaveAttribute('href', '/terms');

      const privacyLink = within(footer).getByRole('link', { name: /Privacy Policy/i });
      expect(privacyLink).toHaveAttribute('href', '/privacy');

      const cookieLink = within(footer).getByRole('link', { name: /Cookie Policy/i });
      expect(cookieLink).toHaveAttribute('href', '/cookies');
    });

    it('renders visible legal links in the authenticated Dashboard footer', () => {
      const mockUser = { id: 'u1', email: 'producer@beathelper.com' };
      render(<Dashboard user={mockUser as any} />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(within(footer).getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('href', '/terms');
      expect(within(footer).getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
      expect(within(footer).getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('href', '/cookies');
    });

    it('renders clickable links to /terms, /privacy, and /cookies on the Login page for API compliance', () => {
      render(<LoginPage />);

      expect(screen.getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('href', '/terms');
      expect(screen.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
      expect(screen.getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('href', '/cookies');
    });

    it('suppresses Sidebar completely on standalone routes even with trailing slashes, mixed-case paths, and for authenticated users', async () => {
      const mockUser = { id: 'u-auth', email: 'user@beathelper.com' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

      for (const route of [
        '/terms',
        '/privacy',
        '/cookies',
        '/login',
        '/terms/',
        '/privacy/',
        '/cookies/',
        '/login/',
        '/Terms',
        '/Privacy',
        '/Cookies',
        '/Login',
        '/TERMS/',
        '/PRIVACY/',
        '/COOKIES/',
        '/LOGIN/',
      ]) {
        mockUsePathname.mockReturnValue(route);
        let container: any = null;
        await act(async () => {
          const res = render(<Sidebar />);
          container = res.container;
        });
        expect(container?.firstChild).toBeNull();
      }
    });

    it('renders global legal links in Sidebar footer on app routes', async () => {
      mockUsePathname.mockReturnValue('/bity');
      await act(async () => {
        render(<Sidebar />);
      });

      const aside = screen.getByRole('complementary');
      expect(within(aside).getByRole('link', { name: /^terms$/i })).toHaveAttribute('href', '/terms');
      expect(within(aside).getByRole('link', { name: /^privacy$/i })).toHaveAttribute('href', '/privacy');
      expect(within(aside).getByRole('link', { name: /^cookies$/i })).toHaveAttribute('href', '/cookies');
    });

    it('renders clickable links to /terms, /privacy, and /cookies on unauthenticated Account page', async () => {
      await act(async () => {
        render(<AccountPage />);
      });

      expect(screen.getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('href', '/terms');
      expect(screen.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
      expect(screen.getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute('href', '/cookies');
    });
  });
});
