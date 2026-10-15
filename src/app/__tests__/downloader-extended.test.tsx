import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import DownloaderPage from '../downloader/page';
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
  },
}));

describe('Downloader Page Extended Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockSingle.mockResolvedValue({
      data: { is_lifetime_paid: false, trial_ends_at: new Date(Date.now() + 86400000).toISOString() },
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Guest User State & Storage Tracking', () => {
    it('defaults guest downloads to 0 when localStorage is empty', async () => {
      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText(/Trial Downloads:/i)).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(/5 remaining/i)).toBeInTheDocument();
    });

    it('reads existing guest count from localStorage', async () => {
      localStorage.setItem('beatlab_mp3_downloads_guest', '3');

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText(/3 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(/2 remaining/i)).toBeInTheDocument();
    });

    it('gracefully handles non-numeric or NaN localStorage value for guest', async () => {
      localStorage.setItem('beatlab_mp3_downloads_guest', 'corrupted-data');

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText(/0 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(/5 remaining/i)).toBeInTheDocument();
    });

    it('triggers download and increments guest count in localStorage on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          title: 'Guest Beat Instrumental',
          link: 'https://cdn.rapidapi.com/guest-audio.mp3',
        }),
      } as any);

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: 'https://youtu.be/sample12345' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/download-mp3', expect.any(Object));
      expect(localStorage.getItem('beatlab_mp3_downloads_guest')).toBe('1');
      expect(screen.getByText(/Guest Beat Instrumental/i)).toBeInTheDocument();
    });
  });

  describe('Authenticated Trial & Lifetime Logic', () => {
    it('picks the maximum value between localStorage and user_metadata', async () => {
      const mockUser = {
        id: 'user-max-count',
        created_at: new Date().toISOString(),
        user_metadata: { mp3_downloads_count: 2 },
      };

      localStorage.setItem('beatlab_mp3_downloads_user-max-count', '4');

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText(/4 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(/1 remaining/i)).toBeInTheDocument();
    });

    it('picks user_metadata when it is higher than localStorage', async () => {
      const mockUser = {
        id: 'user-meta-higher',
        created_at: new Date().toISOString(),
        user_metadata: { mp3_downloads_count: 3 },
      };

      localStorage.setItem('beatlab_mp3_downloads_user-meta-higher', '1');

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText(/3 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(/2 remaining/i)).toBeInTheDocument();
    });

    it('updates user-specific localStorage key upon successful download', async () => {
      const mockUser = {
        id: 'user-sub-key',
        created_at: new Date().toISOString(),
        user_metadata: { mp3_downloads_count: 1 },
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          title: 'Trap Symphony 2026',
          link: 'https://cdn.rapidapi.com/trap-symphony.mp3',
        }),
      } as any);

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=trap1234567' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(localStorage.getItem('beatlab_mp3_downloads_user-sub-key')).toBe('2');
      expect(screen.getByText('Trap Symphony 2026')).toBeInTheDocument();
    });

    it('does not increment downloads count for Lifetime paid users', async () => {
      const mockUser = {
        id: 'user-lifetime',
        created_at: new Date().toISOString(),
        user_metadata: { mp3_downloads_count: 0 },
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      mockSingle.mockResolvedValue({
        data: { is_lifetime_paid: true },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          title: 'Unlimited Lifetime Audio',
          link: 'https://cdn.rapidapi.com/unlimited.mp3',
        }),
      } as any);

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.queryByText(/Lifetime Plan • Unlimited MP3 Downloads/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Trial Downloads:/i)).not.toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=unlimited01' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      // No trial count key written
      expect(localStorage.getItem('beatlab_mp3_downloads_user-lifetime')).toBeNull();
      expect(screen.getByText('Unlimited Lifetime Audio')).toBeInTheDocument();
    });

    it('safely handles error during Supabase subscription lookup without crashing', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Supabase Network Timeout'));

      await act(async () => {
        render(<DownloaderPage />);
      });

      // Renders safely with guest fallback
      expect(screen.getByText(/YouTube MP3 Downloader/i)).toBeInTheDocument();
      expect(screen.getByText(/Trial Downloads:/i)).toBeInTheDocument();
    });
  });

  describe('SessionStorage Restoration & Conversion UI Details', () => {
    it('restores cached conversion result from sessionStorage on mount', async () => {
      sessionStorage.setItem(
        'beatlab_mp3_last_result',
        JSON.stringify({
          title: 'Cached Lo-Fi Beat',
          link: 'https://cdn.rapidapi.com/cached-audio.mp3',
        })
      );

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText('Cached Lo-Fi Beat')).toBeInTheDocument();
      expect(screen.getByText(/Conversion Ready/i)).toBeInTheDocument();

      // Audio player rendered with correct src
      const audioElement = document.querySelector('audio');
      expect(audioElement).toBeInTheDocument();
      expect(audioElement).toHaveAttribute('src', 'https://cdn.rapidapi.com/cached-audio.mp3');
    });

    it('ignores corrupted or invalid JSON in sessionStorage', async () => {
      sessionStorage.setItem('beatlab_mp3_last_result', '{ malformed-json: ');

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.queryByText(/Conversion Ready/i)).not.toBeInTheDocument();
    });

    it('ignores sessionStorage item if link or title are missing', async () => {
      sessionStorage.setItem('beatlab_mp3_last_result', JSON.stringify({ title: 'No link' }));

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.queryByText(/Conversion Ready/i)).not.toBeInTheDocument();
    });

    it('clears active result and sessionStorage when "Convert Another Video" is clicked', async () => {
      sessionStorage.setItem(
        'beatlab_mp3_last_result',
        JSON.stringify({
          title: 'Previous Download',
          link: 'https://cdn.rapidapi.com/prev.mp3',
        })
      );

      await act(async () => {
        render(<DownloaderPage />);
      });

      expect(screen.getByText('Previous Download')).toBeInTheDocument();

      const resetBtn = screen.getByRole('button', { name: /Convert Another Video/i });
      fireEvent.click(resetBtn);

      expect(screen.queryByText('Previous Download')).not.toBeInTheDocument();
      expect(sessionStorage.getItem('beatlab_mp3_last_result')).toBeNull();
    });

    it('renders Download MP3 Now link with target _blank and download attribute', async () => {
      sessionStorage.setItem(
        'beatlab_mp3_last_result',
        JSON.stringify({
          title: 'Boom Bap 90s',
          link: 'https://cdn.rapidapi.com/boombap.mp3',
        })
      );

      await act(async () => {
        render(<DownloaderPage />);
      });

      const downloadLink = screen.getByRole('link', { name: /Download MP3 Now/i });
      expect(downloadLink).toHaveAttribute('href', 'https://cdn.rapidapi.com/boombap.mp3');
      expect(downloadLink).toHaveAttribute('target', '_blank');
      expect(downloadLink).toHaveAttribute('download', 'Boom Bap 90s.mp3');
    });

    it('copies direct link to clipboard when "Copy Direct Link" button is clicked', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      sessionStorage.setItem(
        'beatlab_mp3_last_result',
        JSON.stringify({
          title: 'Direct Link Beat',
          link: 'https://cdn.rapidapi.com/direct-link.mp3',
        })
      );

      await act(async () => {
        render(<DownloaderPage />);
      });

      const copyBtn = screen.getByRole('button', { name: /Copy Direct Link/i });
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://cdn.rapidapi.com/direct-link.mp3');
      expect(screen.getByText(/Link Copied!/i)).toBeInTheDocument();
    });
  });

  describe('Form Handling, Errors & Edge Cases', () => {
    it('does not submit or call fetch if url is empty string or only whitespace', async () => {
      global.fetch = jest.fn();

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: '    ' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('displays error message banner when download API returns an error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'This YouTube video is restricted or longer than 15 minutes.',
        }),
      } as any);

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=too-long' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(screen.getByText(/This YouTube video is restricted or longer than 15 minutes./i)).toBeInTheDocument();
    });

    it('displays fallback error message when API fails without specific error payload', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      } as any);

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=err-fallback' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(screen.getByText('Failed to download')).toBeInTheDocument();
    });

    it('displays network failure message when fetch rejects', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Internet disconnected'));

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Paste YouTube link here/i);
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=offline-test' } });

      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(screen.getByText('Internet disconnected')).toBeInTheDocument();
    });

    it('blocks submission and shows error if isLimitReached is triggered in state', async () => {
      localStorage.setItem('beatlab_mp3_downloads_guest', '5');

      await act(async () => {
        render(<DownloaderPage />);
      });

      const input = screen.getByPlaceholderText(/Trial limit reached \(5\/5\)/i);
      expect(input).toBeDisabled();

      // Submit form directly
      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      // Did not call fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
