import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InstagramLeadsPage, {
  IG_HISTORY_STORAGE_KEY,
  RAPIDAPI_KEY_STORAGE_KEY,
} from '../instagram-leads/page';
import { supabase } from '@/lib/supabase';
import { exportLeadsToExcel, exportLeadsToCsv } from '@/lib/instagram-export';

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
    expect(screen.getByRole('button', { name: /Configure RapidAPI/i })).toBeInTheDocument();
  });

  it('opens API key modal when clicking Configure RapidAPI button and persists key in localStorage', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const apiKeyBtn = screen.getByRole('button', { name: /Configure RapidAPI/i });
    fireEvent.click(apiKeyBtn);

    expect(screen.getByText(/RapidAPI Configuration/i)).toBeInTheDocument();
    const keyInput = screen.getByPlaceholderText(/Paste your RapidAPI key here\.\.\./i);

    fireEvent.change(keyInput, { target: { value: 'test-rapidapi-key-123' } });
    const saveBtn = screen.getByRole('button', { name: /Save API Key/i });
    fireEvent.click(saveBtn);

    expect(localStorage.getItem(RAPIDAPI_KEY_STORAGE_KEY)).toBe('test-rapidapi-key-123');
    expect(screen.queryByText(/RapidAPI Configuration/i)).not.toBeInTheDocument();
  });

  it('handles MISSING_API_KEY error from API and prompts API key modal', async () => {
    await act(async () => {
      render(<InstagramLeadsPage />);
    });

    const input = screen.getByPlaceholderText(/e\.g\. https:\/\/www\.instagram\.com\/roseeyeview\/ or @ontheradar/i);
    fireEvent.change(input, { target: { value: 'missing-api-key' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText(/RapidAPI Configuration/i)).toBeInTheDocument();
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
});
