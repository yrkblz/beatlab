import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InstagramLeadsPage, {
  IG_HISTORY_STORAGE_KEY,
} from '../instagram-leads/page';
import { supabase } from '@/lib/supabase';
import { exportLeadsToExcel, exportLeadsToCsv } from '@/lib/instagram-export';
import { classifyProfile, isMusicLink } from '@/lib/instagram-classifier';

// Mock clipboard and alert
const originalClipboard = navigator.clipboard;
const originalAlert = window.alert;

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  });
  window.alert = jest.fn();
});

afterAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: originalClipboard,
  });
  window.alert = originalAlert;
});

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

jest.mock('@/lib/instagram-export', () => ({
  exportLeadsToExcel: jest.fn(),
  exportLeadsToCsv: jest.fn(),
}));

const mockScrapedLeads = [
  {
    handle: 'centralcee',
    profileUrl: 'https://instagram.com/centralcee',
    category: 'Артист',
    fullName: 'Central Cee',
    bio: 'CC4L • New single out now • linktr.ee/centralcee',
    followers: 125000,
    email: 'booking@centralcee.com',
    phone: '+447911123456',
    publicLinks: ['https://linktr.ee/centralcee', 'https://open.spotify.com/artist/centralcee'],
    dataStatus: 'AVAILABLE',
    categoryCheck: 'CHECKED',
    sourceType: 'Подписчики',
    matchedKeywords: ['artist', 'single out', 'spotify', 'linktr.ee'],
  },
  {
    handle: 'metroboomin',
    profileUrl: 'https://instagram.com/metroboomin',
    category: 'Продюсер',
    fullName: 'Metro Boomin',
    bio: 'If Young Metro don’t trust you... prod by Metro Boomin',
    followers: 180000,
    email: 'mgmt@boominati.com',
    publicLinks: ['https://boominati.com'],
    dataStatus: 'AVAILABLE',
    categoryCheck: 'CHECKED',
    sourceType: 'Подписчики',
    matchedKeywords: ['producer', 'prod by', 'beatmaker'],
  },
];

describe('InstagramLeadsPage (/instagram-leads)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockInsert.mockResolvedValue({ data: null, error: null });

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'usr-123', email: 'producer@beatlab.space' },
      },
    });

    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (typeof url === 'string' && url.includes('/api/instagram-leads')) {
        const body = JSON.parse(options?.body || '{}');

        if (body.source === 'missing-api-key') {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                code: 'MISSING_API_KEY',
                error: 'RapidAPI Key is required to fetch Instagram profiles.',
              }),
          });
        }

        if (body.source === 'empty-search') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ leads: [] }),
          });
        }

        if (body.source === 'exhausted-search') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                leads: [],
                totalScanned: 48,
                isExhausted: true,
                producersFoundCount: 3,
                artistsFoundCount: 0,
              }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ leads: mockScrapedLeads }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders page header, mode selectors, role filters, and search bar', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    expect(screen.getByRole('heading', { name: /Instagram Lead Finder/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Followers$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Following$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Comments on Post$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Hashtag Search$/i })).toBeInTheDocument();
  });

  it('handles API errors gracefully and displays error banner', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'missing-api-key' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/RapidAPI Key is required to fetch Instagram profiles/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays leads correctly in the results table and cards', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'gunna' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('centralcee')).toBeInTheDocument();
      expect(screen.getByText('metroboomin')).toBeInTheDocument();
    });

    expect(screen.getByText('Central Cee')).toBeInTheDocument();
    expect(screen.getByText('booking@centralcee.com')).toBeInTheDocument();
    expect(screen.getByText('mgmt@boominati.com')).toBeInTheDocument();
  });

  it('deduplicates leads already in history when deduplication toggle is enabled', async () => {
    localStorage.setItem(IG_HISTORY_STORAGE_KEY, JSON.stringify(['centralcee']));

    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'gunna' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('metroboomin')).toBeInTheDocument();
    });

    // centralcee should be filtered out by history deduplication
    expect(screen.queryByText('centralcee')).not.toBeInTheDocument();
    expect(screen.getByText(/1 duplicates skipped/i)).toBeInTheDocument();
  });

  it('allows copying handles and emails to clipboard', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'gunna' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('centralcee')).toBeInTheDocument();
    });

    const copyHandlesBtn = screen.getByRole('button', { name: /Copy @Handles/i });
    fireEvent.click(copyHandlesBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('centralcee\nmetroboomin');

    const copyEmailsBtn = screen.getByRole('button', { name: /Copy Emails/i });
    fireEvent.click(copyEmailsBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('booking@centralcee.com\nmgmt@boominati.com');
  });

  it('adds lead to Placement CRM with 1 click', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'gunna' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('centralcee')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add to CRM/i });
    expect(addButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(addButtons[0]);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'usr-123',
          artist_name: 'Central Cee (centralcee)',
          beat_title: 'Unassigned Pack',
          status: 'To Send',
        }),
      ]);
      expect(screen.getByText(/In CRM/i)).toBeInTheDocument();
    });
  });

  it('triggers Excel and CSV exports without errors', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'gunna' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('centralcee')).toBeInTheDocument();
    });

    const excelBtn = screen.getByRole('button', { name: /Excel \(\.xlsx\)/i });
    fireEvent.click(excelBtn);
    expect(exportLeadsToExcel).toHaveBeenCalled();

    const csvBtn = screen.getByRole('button', { name: /CSV/i });
    fireEvent.click(csvBtn);
    expect(exportLeadsToCsv).toHaveBeenCalled();
  });

  it('displays "Przeszukano całe konto" banner when entire account has been scanned', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'exhausted-search' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Przeszukano całe konto \(@exhausted-search\)!/i)).toBeInTheDocument();
      expect(screen.getByText(/Przeskanowano wszystkich/i)).toBeInTheDocument();
      expect(screen.getAllByText(/48/i).length).toBeGreaterThan(0);
    });
  });

  describe('classifyProfile & isMusicLink (Strict Music & Producer Rules)', () => {
    it('isMusicLink accurately identifies Spotify, Apple Music, Linktree, and rejects generic websites', () => {
      expect(isMusicLink('https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb')).toBe(true);
      expect(isMusicLink('https://music.apple.com/us/artist/drake/271256')).toBe(true);
      expect(isMusicLink('https://linktr.ee/prodthurts')).toBe(true);
      expect(isMusicLink('https://soundcloud.com/metroboomin')).toBe(true);
      expect(isMusicLink('https://unitedmasters.com/m/example')).toBe(true);

      // Rejects generic or personal website domains
      expect(isMusicLink('https://zayon.com.br')).toBe(false);
      expect(isMusicLink('https://wayd.com.br')).toBe(false);
      expect(isMusicLink('https://clothingbrand.com')).toBe(false);
      expect(isMusicLink('')).toBe(false);
    });

    it('BeatStars links are accepted ONLY if producers is enabled (allowBeatStores = true)', () => {
      // By default (searching for artists or general), BeatStars is NOT accepted as an artist music link
      expect(isMusicLink('https://beatstars.com/producer123')).toBe(false);
      expect(isMusicLink('https://bsta.rs/abc1234')).toBe(false);
      expect(isMusicLink('https://airbit.com/producer123')).toBe(false);

      // When allowBeatStores is true (searching for producers), BeatStars is accepted!
      expect(isMusicLink('https://beatstars.com/producer123', true)).toBe(true);
      expect(isMusicLink('https://bsta.rs/abc1234', true)).toBe(true);
      expect(isMusicLink('https://airbit.com/producer123', true)).toBe(true);
    });

    it('classifies profiles like "zayon.com.br" and "prodthurts" as Producer, not Artist', () => {
      // Profile from user image 2: zayon.com.br with "BR Producer & Engineer"
      const zayon = classifyProfile(
        'BR Producer & Engineer\nFounder: @wayd.com.br\nMGMT: @bigceo.com.br',
        ['https://wayd.com.br'],
        'zayon.com.br',
        'zayon.'
      );
      expect(zayon.category).toBe('Продюсер');
      expect(zayon.isProducer).toBe(true);
      expect(zayon.isArtist).toBe(false);

      // Profile from user image 1: prodthurts with linktr.ee/prodthurts
      const prodthurts = classifyProfile(
        'DM for beats | cookup daily',
        ['https://linktr.ee/prodthurts'],
        'prodthurts',
        'Thurts'
      );
      expect(prodthurts.category).toBe('Продюсер');
      expect(prodthurts.isProducer).toBe(true);
      expect(prodthurts.isArtist).toBe(false);

      // Actual artist with spotify
      const rapper = classifyProfile(
        'Recording artist • Stream my new single on Spotify',
        ['https://open.spotify.com/artist/123'],
        'young_rapper',
        'Young Rapper'
      );
      expect(rapper.category).toBe('Артист');
      expect(rapper.isArtist).toBe(true);
      expect(rapper.isProducer).toBe(false);
    });

    it('profile with BeatStars link is identified as Producer and link is valid ONLY when allowBeatStores is true', () => {
      // Profile that only has BeatStars link
      const beatstarsProducer = classifyProfile(
        'Check my store for new loops and vibes',
        ['https://beatstars.com/soundmaster'],
        'soundmaster',
        'Sound Master',
        { allowBeatStores: false }
      );

      // When searching for artists (allowBeatStores: false):
      expect(beatstarsProducer.category).toBe('Продюсер');
      expect(beatstarsProducer.isProducer).toBe(true);
      expect(beatstarsProducer.isArtist).toBe(false);
      // BeatStars is NOT accepted as a music link for artists:
      expect(beatstarsProducer.hasMusicLink).toBe(false);

      // When searching for producers (allowBeatStores: true):
      const forProducersSearch = classifyProfile(
        'Check my store for new loops and vibes',
        ['https://beatstars.com/soundmaster'],
        'soundmaster',
        'Sound Master',
        { allowBeatStores: true }
      );
      expect(forProducersSearch.category).toBe('Продюсер');
      expect(forProducersSearch.isProducer).toBe(true);
      expect(forProducersSearch.isArtist).toBe(false);
      // BeatStars IS accepted as a qualifying link when searching for producers!
      expect(forProducersSearch.hasMusicLink).toBe(true);
    });
  });
});
