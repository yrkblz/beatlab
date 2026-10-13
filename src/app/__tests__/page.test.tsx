import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import Home, { metadata, Dashboard, LandingPage } from '../page';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe('BEATLAB Landing Page (Guest View)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('exports valid metadata for SEO and page title', () => {
    expect(metadata.title).toBeDefined();
    expect(metadata.title).toContain('BEATLAB');
    expect(metadata.description).toBeDefined();
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.twitter).toBeDefined();
  });

  it('renders without crashing', () => {
    render(<Home />);
  });

  it('renders the top navigation bar with branding and anchors, without reviews link', () => {
    render(<Home />);
    expect(screen.getByText(/Studio Suite|SaaS Suite/i)).toBeInTheDocument();
    
    const header = screen.getByRole('banner');
    const mainNav = screen.getByRole('navigation', { name: /main navigation/i });

    expect(within(mainNav).getByRole('link', { name: /^features$/i })).toHaveAttribute('href', '#features');
    expect(within(mainNav).getByRole('link', { name: /^all modules$/i })).toHaveAttribute('href', '#modules');
    expect(within(mainNav).getByRole('link', { name: /^workflow$/i })).toHaveAttribute('href', '#workflow');
    expect(within(mainNav).queryByRole('link', { name: /^reviews$/i })).not.toBeInTheDocument();
    expect(within(header).getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
  });

  it('renders the main hero headline', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Scale Your Beat Business with Intelligent Producer Tools/i);
  });

  it('renders prominent hero logo and secondary hero action linking to features', () => {
    render(<Home />);
    const heroLogos = screen.getAllByRole('img', { name: /BEATLAB/i });
    expect(heroLogos.length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /explore core modules/i })).toHaveAttribute('href', '#features');
  });

  it('renders primary call to action links', () => {
    render(<Home />);
    const ctaLinks = screen.getAllByRole('link', { name: /start managing beats|get started/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute('href', '/login');
  });

  it('renders all 3 core feature modules: CRM, License Generator, and Finance', () => {
    render(<Home />);
    expect(screen.getAllByRole('heading', { name: /Placement CRM/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: /License Generator/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: /Finance & Sales/i }).length).toBeGreaterThan(0);
  });

  it('renders direct navigation links to the core modules', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: /open placement crm/i })).toHaveAttribute('href', '/crm');
    expect(screen.getByRole('link', { name: /generate a license/i })).toHaveAttribute('href', '/licenses');
    expect(screen.getByRole('link', { name: /view finance hub/i })).toHaveAttribute('href', '/finanse');
  });

  it('renders trust indicators and trial guarantees', () => {
    render(<Home />);
    expect(screen.getByText(/free 3-day trial/i)).toBeInTheDocument();
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/instant studio setup/i)).toBeInTheDocument();
  });

  it('renders extended studio ecosystem modules', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /Beat Catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Mail Tracker/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Lead Finder/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Email Validator/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /YT Downloader/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Social Publisher/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open catalog/i })).toHaveAttribute('href', '/bity');
    expect(screen.getByRole('link', { name: /open mailer/i })).toHaveAttribute('href', '/mailer');
    expect(screen.getByRole('link', { name: /find leads/i })).toHaveAttribute('href', '/leads');
    expect(screen.getByRole('link', { name: /validate list/i })).toHaveAttribute('href', '/validator');
    expect(screen.getByRole('link', { name: /open downloader/i })).toHaveAttribute('href', '/downloader');
    expect(screen.getByRole('link', { name: /open publisher/i })).toHaveAttribute('href', '/publisher');
  });

  it('renders the 3-step producer workflow section', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /Designed for the Real Producer Workflow/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Upload & Catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Pitch & Track Placements/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /License & Bank Revenue/i })).toBeInTheDocument();
  });

  it('does not render the testimonials or reviews section completely', () => {
    render(<Home />);
    expect(screen.queryByText(/Trusted by Top Charting Producers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Marcus Kelly/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dave Soundz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alexandre K\./i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^reviews$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/5 out of 5 stars/i)).not.toBeInTheDocument();
  });

  it('renders bottom call to action banner with login and live demo links', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /Take Control of Your Beat Business Today/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Started with (BEATLAB|BeatHelper)/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /View Live Demo/i })).toHaveAttribute('href', '/crm');
  });

  it('renders the footer with BEATLAB branding, copyright, and categorized columns', () => {
    render(<Home />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/2026 (BEATLAB|BeatHelper) Inc\. All rights reserved/i)).toBeInTheDocument();
    expect(within(footer).getByRole('heading', { name: /Core Modules/i })).toBeInTheDocument();
    expect(within(footer).getByRole('heading', { name: /Tools & Outreach/i })).toBeInTheDocument();
    expect(within(footer).getByRole('heading', { name: /Platform/i })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: /Account Settings/i })).toHaveAttribute('href', '/account');
    expect(within(footer).getByRole('link', { name: /YT Downloader/i })).toHaveAttribute('href', '/downloader');
    expect(within(footer).getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
    expect(within(footer).getByRole('link', { name: /^workflow$/i })).toHaveAttribute('href', '#workflow');
  });

  it('renders accessible landmarks on the landing page', () => {
    render(<Home />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('renders interactive 3D tilt cards on the landing page', () => {
    render(<Home />);
    const tiltCards = screen.getAllByTestId('tilt-card');
    expect(tiltCards.length).toBeGreaterThan(0);
  });

  it('renders animated equalizer elements and floating studio badges without the audio player', () => {
    render(<Home />);
    expect(screen.queryByTestId('audio-waveform-visualizer')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('mini-audio-equalizer').length).toBeGreaterThan(0);
    expect(screen.getByText(/140 BPM Trap Beat/i)).toBeInTheDocument();
    expect(screen.getByText(/\+\$500 Exclusive Sold/i)).toBeInTheDocument();
  });

  it('renders live metrics showcase with animated counters and cloud sync beacon', () => {
    render(<Home />);
    expect(screen.getByTestId('live-metrics-showcase')).toBeInTheDocument();
    expect(screen.getByText('Trusted by Modern Independent Producers')).toBeInTheDocument();
    expect(screen.getByText(/Live Cloud Sync Active/i)).toBeInTheDocument();
    expect(screen.getByText('Net Beat Sales Tracked')).toBeInTheDocument();
    expect(screen.getByText('Producer Contracts Signed')).toBeInTheDocument();
    expect(screen.getByText('Artist Outreach Deliverability')).toBeInTheDocument();
  });

  it('renders landing page container spanning full width without margin offsets', () => {
    const { container } = render(<LandingPage />);
    const landingRoot = container.firstChild as HTMLElement;
    expect(landingRoot).toHaveClass('w-full');
    expect(landingRoot).not.toHaveClass('-m-8');
  });
});

describe('BEATLAB Authenticated Dashboard Routing', () => {
  const mockUser = {
    id: 'user-producer-123',
    email: 'producer@beathelper.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('renders Landing Page for unauthenticated guest visitors', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: /^Dashboard$/i })).not.toBeInTheDocument();
  });

  it('renders Dashboard grid when user is logged in via initialUser prop', () => {
    render(<Home initialUser={mockUser as any} />);
    expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/producer@beathelper\.com/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).not.toBeInTheDocument();
  });

  it('renders Dashboard grid when user is fetched asynchronously from supabase auth', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/producer@beathelper\.com/i)).toBeInTheDocument();
  });

  it('renders all feature cards in the dashboard grid with links to all tools', () => {
    render(<Home initialUser={mockUser as any} />);

    expect(screen.getByRole('heading', { name: 'Beat Catalog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Placement CRM' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'License Generator' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mail Tracker' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lead Finder' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Email Validator' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'YT Downloader' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Social Publisher' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /open catalog/i })).toHaveAttribute('href', '/bity');
    expect(screen.getByRole('link', { name: /view finance/i })).toHaveAttribute('href', '/finanse');
    expect(screen.getByRole('link', { name: /manage placements/i })).toHaveAttribute('href', '/crm');
    expect(screen.getByRole('link', { name: /create license/i })).toHaveAttribute('href', '/licenses');
    expect(screen.getByRole('link', { name: /open mailer/i })).toHaveAttribute('href', '/mailer');
    expect(screen.getByRole('link', { name: /find leads/i })).toHaveAttribute('href', '/leads');
    expect(screen.getByRole('link', { name: /validate emails/i })).toHaveAttribute('href', '/validator');
    expect(screen.getByRole('link', { name: /open downloader/i })).toHaveAttribute('href', '/downloader');
    expect(screen.getByRole('link', { name: /open publisher/i })).toHaveAttribute('href', '/publisher');
  });

  it('renders direct account settings link and active workspace status in dashboard', () => {
    render(<Home initialUser={mockUser as any} />);

    expect(screen.getByRole('link', { name: /account settings/i })).toHaveAttribute('href', '/account');
    expect(screen.getByText('Studio Workspace Active')).toBeInTheDocument();
  });

  it('transitions between landing page and dashboard when auth state changes dynamically', async () => {
    let authCallback: any = null;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<Home />);
    expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: /^Dashboard$/i })).not.toBeInTheDocument();

    // Trigger sign in
    await act(async () => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    });

    // Trigger sign out
    await act(async () => {
      authCallback('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();
    });
  });

  it('renders Dashboard standalone component with custom user', () => {
    render(<Dashboard user={{ id: 'u1', email: 'custom@beatmaker.com' } as any} />);
    expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/custom@beatmaker\.com/i)).toBeInTheDocument();
  });

  it('renders stage_name or full_name from user_metadata in Dashboard greeting when present', () => {
    render(
      <Dashboard
        user={
          {
            id: 'u-stage',
            email: 'test@example.com',
            user_metadata: { stage_name: 'Metro Boomin' },
          } as any
        }
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/Metro Boomin/i)).toBeInTheDocument();
  });

  it('renders generic greeting when user has no email or name in metadata', () => {
    render(<Dashboard user={{ id: 'u-anon' } as any} />);
    expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Welcome back\. Manage your catalog, track deals, and scale your studio\./i)
    ).toBeInTheDocument();
  });

  it('handles null data or error response from supabase.auth.getUser() gracefully', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid JWT' },
    });

    render(<Home />);

    // Should remain on Landing Page without throwing uncaught destructuring error
    expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();
  });

  it('handles network rejection from supabase.auth.getUser() gracefully without throwing', async () => {
    (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Network connection failed'));

    render(<Home />);

    // Should gracefully render Landing Page
    expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();
  });

  it('synchronizes state when initialUser prop updates on re-render', () => {
    const { rerender } = render(<Home initialUser={null} />);
    expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();

    rerender(<Home initialUser={mockUser as any} />);
    expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/producer@beathelper\.com/i)).toBeInTheDocument();
  });

  it('safely cleans up subscription on unmount even if subscription is missing', () => {
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: undefined },
    });

    const { unmount } = render(<Home />);
    expect(() => unmount()).not.toThrow();
  });

  it('preserves initialUser when client-side getUser resolves with null data or error', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'No active session token' },
    });

    render(<Home initialUser={mockUser as any} />);

    // Should remain on Dashboard even after getUser promise resolves
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/producer@beathelper\.com/i)).toBeInTheDocument();
  });

  it('renders LandingPage standalone component without crashing and without reviews', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Scale Your Beat Business/i })).toBeInTheDocument();
    expect(screen.queryByText(/Trusted by Top Charting Producers/i)).not.toBeInTheDocument();
  });

  it('renders quick action shortcuts linking to CRM and Licenses in dashboard', () => {
    render(<Home initialUser={mockUser as any} />);
    expect(screen.getByRole('link', { name: /quick pitch/i })).toHaveAttribute('href', '/crm');
    expect(screen.getByRole('link', { name: /new license/i })).toHaveAttribute('href', '/licenses');
  });

  it('trims whitespace-only email and names in Dashboard greeting', () => {
    render(
      <Dashboard
        user={
          {
            id: 'u-spaces',
            email: '   ',
            user_metadata: { stage_name: '   ', full_name: '   ' },
          } as any
        }
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: /^Dashboard$/i })).toBeInTheDocument();
    expect(
      screen.getByText('Welcome back. Manage your catalog, track deals, and scale your studio.')
    ).toBeInTheDocument();
  });
});
