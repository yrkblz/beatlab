import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DownloaderPage from '../downloader/page';
import PublisherPage from '../publisher/page';
import { supabase } from '@/lib/supabase';

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: jest.fn(() => ({
      select: mockSelect,
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.video/1.mp4' } })),
      })),
    },
  },
}));

describe('Downloader Page (/downloader) Trial Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders trial badge with remaining downloads when user is in trial', async () => {
    const mockUser = {
      id: 'trial-user-1',
      created_at: new Date().toISOString(),
      user_metadata: { mp3_downloads_count: 2 },
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
    });

    mockSingle.mockResolvedValue({
      data: {
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
      },
    });

    await act(async () => {
      render(<DownloaderPage />);
    });

    expect(
      screen.getByText(/Trial Downloads:/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 5/i)).toBeInTheDocument();
    expect(screen.getByText(/3 remaining/i)).toBeInTheDocument();
  });

  it('blocks downloads and displays upgrade banner when 5 trial downloads are reached', async () => {
    const mockUser = {
      id: 'trial-user-limit',
      created_at: new Date().toISOString(),
      user_metadata: { mp3_downloads_count: 5 },
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
    });

    mockSingle.mockResolvedValue({
      data: {
        is_lifetime_paid: false,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
      },
    });

    await act(async () => {
      render(<DownloaderPage />);
    });

    // Check limit banner
    expect(
      screen.getByRole('heading', { name: /5 of 5 Free Downloads Used/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Trial Limit Reached/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Unlock Unlimited \(\$29\)/i })
    ).toHaveAttribute('href', '/upgrade');

    // Input should be disabled
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('displays unlimited downloads badge for lifetime access members', async () => {
    const mockUser = {
      id: 'lifetime-user',
      created_at: new Date().toISOString(),
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
    });

    mockSingle.mockResolvedValue({
      data: {
        is_lifetime_paid: true,
      },
    });

    await act(async () => {
      render(<DownloaderPage />);
    });

    expect(
      screen.getByText(/Lifetime Plan • Unlimited MP3 Downloads/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Trial Limit Reached/i)).not.toBeInTheDocument();
  });
});

describe('Social Auto-Publisher Page (/publisher) Coming Soon Mode', () => {
  it('displays Coming Soon notice banner with pending API approval information', () => {
    render(<PublisherPage />);

    expect(
      screen.getByRole('heading', { name: /Social Auto-Publisher is Launching Soon/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Awaiting API Approval/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Instagram Graph API/i)).toBeInTheDocument();
    expect(screen.getByText(/TikTok Content Posting API/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Coming Soon \(Awaiting API Keys\)/i })
    ).toBeInTheDocument();
  });

  it('keeps underlying upload and description form elements intact', () => {
    render(<PublisherPage />);

    expect(screen.getByText(/Video File/i)).toBeInTheDocument();
    expect(screen.getByText(/Caption & Hashtags/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Instagram/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TikTok/i).length).toBeGreaterThan(0);
  });
});
