import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BityPage from '../bity/page';
import { supabase } from '@/lib/supabase';

// Mock window.confirm & alert
const originalConfirm = window.confirm;
const originalAlert = window.alert;
beforeAll(() => {
  window.confirm = jest.fn();
  window.alert = jest.fn();
});
afterAll(() => {
  window.confirm = originalConfirm;
  window.alert = originalAlert;
});

const mockBeatsList = [
  {
    id: 'b-1',
    title: 'Midnight Trap',
    genre: 'Trap',
    bpm: 140,
    key_signature: 'C Minor',
    file_url: 'https://example.com/midnight-trap.mp3',
    created_at: '2026-03-01T12:00:00Z',
    user_id: 'usr-123',
  },
  {
    id: 'b-2',
    title: 'Summer Afro',
    genre: 'Afrobeat',
    bpm: 105,
    key_signature: 'G Major',
    file_url: 'https://example.com/summer-afro.mp3',
    created_at: '2026-03-02T12:00:00Z',
    user_id: 'usr-123',
  },
  {
    id: 'b-3',
    title: 'Dark Drill Anthem',
    genre: 'Drill',
    bpm: 142,
    key_signature: 'D Minor',
    file_url: 'https://example.com/dark-drill.mp3',
    created_at: '2026-03-03T12:00:00Z',
    user_id: 'usr-123',
  },
];

const mockDeleteMatch = jest.fn().mockResolvedValue({ error: null });
const mockDelete = jest.fn(() => ({ match: mockDeleteMatch }));
const mockInsert = jest.fn().mockResolvedValue({ error: null });

const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test.mp3' }, error: null });
const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/uploaded.mp3' } });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'beats') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: mockBeatsList, error: null }),
            })),
          })),
          insert: mockInsert,
          delete: mockDelete,
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      };
    }),
  },
}));

describe('BityPage (/bity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.space' } },
    });
  });

  it('renders sign in prompt when unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<BityPage />);
    });

    expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Login/i })).toBeInTheDocument();
  });

  it('renders Add new beat panel and genre filter pills', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    expect(screen.getByRole('heading', { name: /\+ Add new beat/i })).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getAllByText('Trap').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Boom Bap').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Drill').length).toBeGreaterThan(0);
  });

  it('renders beats table headers and fetched beats', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Midnight Trap')).toBeInTheDocument();
      expect(screen.getByText('Summer Afro')).toBeInTheDocument();
      expect(screen.getByText('Dark Drill Anthem')).toBeInTheDocument();
    });

    expect(screen.getByText(/140 • C Minor/i)).toBeInTheDocument();
    expect(screen.getByText(/105 • G Major/i)).toBeInTheDocument();
    expect(screen.getByText(/142 • D Minor/i)).toBeInTheDocument();
  });

  it('renders download links pointing to beat file URLs', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Download/i }).length).toBe(3);
    });

    const links = screen.getAllByRole('link', { name: /Download/i });
    expect(links[0]).toHaveAttribute('href', 'https://example.com/midnight-trap.mp3');
  });

  it('filters beats by genre when clicking a genre pill', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Midnight Trap')).toBeInTheDocument();
    });

    // Click 'Afrobeat' filter pill
    const afroFilterBtn = screen.getByRole('button', { name: 'Afrobeat' });
    fireEvent.click(afroFilterBtn);

    expect(screen.getByText('Summer Afro')).toBeInTheDocument();
    expect(screen.queryByText('Midnight Trap')).not.toBeInTheDocument();
    expect(screen.queryByText('Dark Drill Anthem')).not.toBeInTheDocument();
  });

  it('restores all beats when clicking "All" filter pill', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    const afroFilterBtn = screen.getByRole('button', { name: 'Afrobeat' });
    fireEvent.click(afroFilterBtn);

    const allBtn = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allBtn);

    await waitFor(() => {
      expect(screen.getByText('Midnight Trap')).toBeInTheDocument();
      expect(screen.getByText('Summer Afro')).toBeInTheDocument();
      expect(screen.getByText('Dark Drill Anthem')).toBeInTheDocument();
    });
  });

  it('allows picking a different genre in upload form', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    // CustomSelect for Genre initially shows 'Trap'
    const genreSelects = screen.getAllByText('Trap');
    fireEvent.click(genreSelects[0]);

    const rAndBOption = screen.getAllByText('R&B')[0];
    fireEvent.click(rAndBOption);

    expect(screen.getAllByText('R&B').length).toBeGreaterThan(0);
  });

  it('allows picking a different key in upload form', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    const keySelect = screen.getByText('C Minor');
    fireEvent.click(keySelect);

    const fMinorOption = screen.getByText('F Minor');
    fireEvent.click(fMinorOption);

    expect(screen.getByText('F Minor')).toBeInTheDocument();
  });

  it('handles MP3 file selection via file input', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    const file = new File(['dummy mp3 audio data'], 'banger.mp3', { type: 'audio/mpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('banger.mp3')).toBeInTheDocument();
  });

  it('submits beat upload to storage and inserts row into Supabase', async () => {
    await act(async () => {
      render(<BityPage />);
    });

    const titleInput = screen.getByPlaceholderText(/e\.g\. Dark Knight/i);
    fireEvent.change(titleInput, { target: { value: 'Skyfall Beat' } });

    const bpmInput = screen.getByPlaceholderText('140');
    fireEvent.change(bpmInput, { target: { value: '130' } });

    const file = new File(['dummy mp3'], 'skyfall.mp3', { type: 'audio/mpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByRole('button', { name: /Save to Database/i });
    const form = submitBtn.closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Skyfall Beat',
        bpm: 130,
        file_url: 'https://example.com/uploaded.mp3',
        user_id: 'usr-123',
      }),
    ]);
  });

  it('prompts window.confirm and deletes beat when user confirms', async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<BityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Midnight Trap')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash-2') || b.querySelector('svg.lucide-trash'));
    if (deleteBtns.length > 0) {
      await act(async () => {
        fireEvent.click(deleteBtns[0]);
      });
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this beat?');
      expect(mockDeleteMatch).toHaveBeenCalledWith({ id: 'b-1' });
    }
  });

  it('aborts beat deletion when user cancels window.confirm', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    await act(async () => {
      render(<BityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Midnight Trap')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash-2') || b.querySelector('svg.lucide-trash'));
    if (deleteBtns.length > 0) {
      await act(async () => {
        fireEvent.click(deleteBtns[0]);
      });
      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteMatch).not.toHaveBeenCalled();
    }
  });

  it('shows empty state message when user has zero beats', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
      insert: mockInsert,
      delete: mockDelete,
    });

    await act(async () => {
      render(<BityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No beats found\./i)).toBeInTheDocument();
    });
  });
});
