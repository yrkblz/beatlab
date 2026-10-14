import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LeadsPage from '../leads/page';

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

const mockLeadsData = [
  {
    channelName: '808 Mafia Beats',
    instagram: '808mafiaboss',
    videoTitle: 'Future x Southside Type Beat 2026',
    videoUrl: 'https://youtube.com/watch?v=vid123',
  },
  {
    channelName: 'TrapCity Productions',
    instagram: 'trapcityproducer',
    videoTitle: 'Lil Baby Hard Trap Beat',
    videoUrl: 'https://youtube.com/watch?v=vid456',
  },
];

describe('LeadsPage (/leads)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (typeof url === 'string' && url.includes('/api/leads')) {
        const body = JSON.parse(options?.body || '{}');
        if (body.query === 'empty') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ leads: [] }),
          });
        }
        if (body.query === 'error-trigger') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'YouTube API quota exceeded' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ leads: mockLeadsData }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders page heading and search form', () => {
    render(<LeadsPage />);
    expect(screen.getByRole('heading', { name: /Lead Finder \(YouTube\)/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search Leads/i })).toBeInTheDocument();
  });

  it('submits search query to /api/leads and renders results table', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'drake type beat' } });

    const submitBtn = screen.getByRole('button', { name: /Search Leads/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'drake type beat', maxResults: 50 }),
    });

    await waitFor(() => {
      expect(screen.getByText('808 Mafia Beats')).toBeInTheDocument();
      expect(screen.getByText('808mafiaboss')).toBeInTheDocument();
      expect(screen.getByText('TrapCity Productions')).toBeInTheDocument();
      expect(screen.getByText('trapcityproducer')).toBeInTheDocument();
    });
  });

  it('renders lead Instagram profile links with correct attributes', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'future type beat' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('808mafiaboss')).toBeInTheDocument();
    });

    const igLink = screen.getByRole('link', { name: /808mafiaboss/i });
    expect(igLink).toHaveAttribute('href', 'https://instagram.com/808mafiaboss');
    expect(igLink).toHaveAttribute('target', '_blank');
  });

  it('copies extracted Instagram handles to clipboard', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'gunna type beat' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy IG Only/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy IG Only/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('808mafiaboss\ntrapcityproducer');
    expect(window.alert).toHaveBeenCalledWith('Instagram handles copied to clipboard!');
  });

  it('displays message when search returns zero leads', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'empty' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/No Instagram handles found in the descriptions of the latest 50 videos for this tag\./i)
      ).toBeInTheDocument();
    });
  });

  it('displays error banner when API returns an error response', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'error-trigger' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/YouTube API quota exceeded/i)).toBeInTheDocument();
    });
  });

  it('displays network failure error message when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));

    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'network-fail' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    });
  });

  it('allows changing scan limit quantity and sends chosen maxResults in API request', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'metro boomin type beat' } });

    // Select 25 videos
    const btn25 = screen.getByRole('button', { name: /25 videos/i });
    fireEvent.click(btn25);

    const submitBtn = screen.getByRole('button', { name: /Search Leads/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'metro boomin type beat', maxResults: 25 }),
    });
  });

  it('filters out previously discovered leads when "Only unique leads" is checked', async () => {
    // Pre-populate history with one of the mock leads
    localStorage.setItem(
      'beatlab_discovered_leads_history',
      JSON.stringify([
        {
          instagram: '808mafiaboss',
          channelName: '808 Mafia Beats',
          savedAt: '2026-01-01T00:00:00.000Z',
        },
      ])
    );

    render(<LeadsPage />);

    // Enable "Only unique leads" checkbox
    const uniqueCheckbox = screen.getByRole('checkbox', {
      name: /Only unique leads \(exclude previously found\)/i,
    });
    fireEvent.click(uniqueCheckbox);

    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'travis scott type beat' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      // 808mafiaboss is filtered out, but trapcityproducer is displayed
      expect(screen.queryByText('808mafiaboss')).not.toBeInTheDocument();
      expect(screen.getByText('trapcityproducer')).toBeInTheDocument();
      expect(screen.getByText(/1 duplicate skipped/i)).toBeInTheDocument();
    });
  });

  it('re-displays filtered duplicates when "Only unique leads" is toggled off', async () => {
    localStorage.setItem(
      'beatlab_discovered_leads_history',
      JSON.stringify([
        {
          instagram: '808mafiaboss',
          channelName: '808 Mafia Beats',
          savedAt: '2026-01-01T00:00:00.000Z',
        },
      ])
    );

    render(<LeadsPage />);

    const uniqueCheckbox = screen.getByRole('checkbox', {
      name: /Only unique leads \(exclude previously found\)/i,
    });
    fireEvent.click(uniqueCheckbox);

    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'playboi carti beat' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('trapcityproducer')).toBeInTheDocument();
      expect(screen.queryByText('808mafiaboss')).not.toBeInTheDocument();
    });

    // Toggle off unique filter
    fireEvent.click(uniqueCheckbox);

    // Both should now be visible
    expect(screen.getByText('808mafiaboss')).toBeInTheDocument();
    expect(screen.getByText('trapcityproducer')).toBeInTheDocument();
  });

  it('exports all leads formatted as CSV with headers and channel links', async () => {
    render(<LeadsPage />);
    const input = screen.getByPlaceholderText(/e\.g\. playboi carti type beat/i);
    fireEvent.change(input, { target: { value: 'csv export test' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Search Leads/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    });

    const csvBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(csvBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('YouTube Channel,Instagram,Video Title,Video URL')
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"808 Mafia Beats","@808mafiaboss"')
    );
  });

  it('clears saved leads history when user confirms clear action', async () => {
    window.confirm = jest.fn().mockReturnValue(true);

    localStorage.setItem(
      'beatlab_discovered_leads_history',
      JSON.stringify([
        {
          instagram: 'artist1',
          channelName: 'Channel 1',
          savedAt: '2026-01-01',
        },
      ])
    );

    render(<LeadsPage />);

    expect(screen.getByText(/1 in history/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByText(/0 in history/i)).toBeInTheDocument();
    expect(localStorage.getItem('beatlab_discovered_leads_history')).toBeNull();
  });
});
