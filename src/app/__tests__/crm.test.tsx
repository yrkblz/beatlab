import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CRMPage from '../crm/page';
import { supabase } from '@/lib/supabase';

// Mock window.alert
const originalAlert = window.alert;
beforeAll(() => {
  window.alert = jest.fn();
});
afterAll(() => {
  window.alert = originalAlert;
});

const mockPlacements = [
  {
    id: 'p-1',
    artist_name: 'Drake',
    beat_title: 'Certified Hit',
    notes: 'Sent to manager via email',
    status: 'To Send',
    created_at: '2026-04-01T12:00:00Z',
    user_id: 'usr-123',
  },
  {
    id: 'p-2',
    artist_name: 'Future',
    beat_title: 'Mask Off 2',
    notes: 'DM sent on Instagram',
    status: 'Sent',
    created_at: '2026-04-02T12:00:00Z',
    user_id: 'usr-123',
  },
  {
    id: 'p-3',
    artist_name: 'Travis Scott',
    beat_title: 'Utopia Wave',
    notes: 'Studio session feedback requested',
    status: 'Listened',
    created_at: '2026-04-03T12:00:00Z',
    user_id: 'usr-123',
  },
  {
    id: 'p-4',
    artist_name: 'Gunna',
    beat_title: 'Drip Melody',
    notes: 'Confirmed on upcoming album tracklist!',
    status: 'Placement',
    created_at: '2026-04-04T12:00:00Z',
    user_id: 'usr-123',
  },
];

const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));
const mockUpdateEq = jest.fn(() => ({
  select: jest.fn().mockResolvedValue({ data: [{ ...mockPlacements[0], artist_name: 'Drake Updated' }], error: null }),
}));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockInsertSelect = jest.fn().mockResolvedValue({
  data: [{
    id: 'p-new',
    artist_name: '21 Savage',
    beat_title: 'Slaughter Beat',
    notes: 'Sent pack',
    status: 'To Send',
    user_id: 'usr-123',
  }],
  error: null,
});
const mockInsert = jest.fn(() => ({ select: mockInsertSelect }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn((table: string) => {
      if (table === 'placements') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: mockPlacements, error: null }),
            })),
          })),
          insert: mockInsert,
          update: mockUpdate,
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

describe('CRMPage (/crm)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.space' } },
    });
  });

  it('renders sign in prompt when unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<CRMPage />);
    });

    expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Login/i })).toBeInTheDocument();
  });

  it('renders Kanban board header and Add Lead button', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    expect(screen.getByRole('heading', { name: 'Placement CRM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Lead/i })).toBeInTheDocument();
  });

  it('renders all 4 Kanban board columns: To Send, Sent, Listened, Placement', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    expect(screen.getByRole('heading', { name: /To Send/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sent/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Listened/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Placement/i })).toBeInTheDocument();
  });

  it('renders fetched placement cards under their respective columns', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
      expect(screen.getByText('Future')).toBeInTheDocument();
      expect(screen.getByText('Travis Scott')).toBeInTheDocument();
      expect(screen.getByText('Gunna')).toBeInTheDocument();
    });

    expect(screen.getByText(/Certified Hit/i)).toBeInTheDocument();
    expect(screen.getByText(/Mask Off 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Utopia Wave/i)).toBeInTheDocument();
    expect(screen.getByText(/Drip Melody/i)).toBeInTheDocument();
  });

  it('displays notes attached to placements', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Sent to manager via email/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirmed on upcoming album tracklist!/i)).toBeInTheDocument();
    });
  });

  it('opens and closes the Add Lead form with Cancel button', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    const addLeadBtn = screen.getByRole('button', { name: /Add Lead/i });
    fireEvent.click(addLeadBtn);

    expect(screen.getByRole('heading', { name: 'New Lead' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Drake/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. 6ix God/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('heading', { name: 'New Lead' })).not.toBeInTheDocument();
  });

  it('submits a new lead to Supabase and adds it to the column', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Lead/i }));

    const artistInput = screen.getByPlaceholderText(/e\.g\. Drake/i);
    fireEvent.change(artistInput, { target: { value: '21 Savage' } });

    const beatInput = screen.getByPlaceholderText(/e\.g\. 6ix God/i);
    fireEvent.change(beatInput, { target: { value: 'Slaughter Beat' } });

    const notesInput = screen.getByPlaceholderText(/Manager's email\.\.\./i);
    fireEvent.change(notesInput, { target: { value: 'Sent pack' } });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        artist_name: '21 Savage',
        beat_title: 'Slaughter Beat',
        notes: 'Sent pack',
        status: 'To Send',
        user_id: 'usr-123',
      }),
    ]);
  });

  it('opens delete confirmation modal when clicking Trash icon', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const card = screen.getByText('Drake').closest('.cursor-grab');
    const deleteBtn = card?.querySelectorAll('button')[1];
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
    }

    expect(screen.getByRole('heading', { name: 'Delete Contact' })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this contact from your board\?/i)).toBeInTheDocument();
  });

  it('confirms placement deletion and calls Supabase delete', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const card = screen.getByText('Drake').closest('.cursor-grab');
    const deleteBtn = card?.querySelectorAll('button')[1];
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
    }

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Yes, delete' });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(mockDelete).toHaveBeenCalled();
  });

  it('cancels placement deletion when Cancel button is clicked in modal', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const card = screen.getByText('Drake').closest('.cursor-grab');
    const deleteBtn = card?.querySelectorAll('button')[1];
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
    }

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('heading', { name: 'Delete Contact' })).not.toBeInTheDocument();
  });

  it('opens edit modal with prefilled data when clicking edit Pencil icon', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const card = screen.getByText('Drake').closest('.cursor-grab');
    const editBtn = card?.querySelectorAll('button')[0];
    if (editBtn) {
      fireEvent.click(editBtn);
    }

    expect(screen.getByRole('heading', { name: 'Edit Lead' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Drake')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Certified Hit')).toBeInTheDocument();
  });

  it('saves updated placement data in Supabase on edit submission', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const card = screen.getByText('Drake').closest('.cursor-grab');
    const editBtn = card?.querySelectorAll('button')[0];
    if (editBtn) {
      fireEvent.click(editBtn);
    }

    const artistInput = screen.getByDisplayValue('Drake');
    fireEvent.change(artistInput, { target: { value: 'Drake (OVO)' } });

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('supports HTML5 drag and drop between Kanban columns', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const card = screen.getByText('Drake').closest('.cursor-grab');
    expect(card).toBeInTheDocument();

    const mockDataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(() => 'p-1'),
    };

    if (card) {
      fireEvent.dragStart(card, { dataTransfer: mockDataTransfer });
      expect(mockDataTransfer.setData).toHaveBeenCalledWith('placementId', 'p-1');
    }

    const sentCol = screen.getByRole('heading', { name: /Sent/i }).closest('.flex-col');
    if (sentCol) {
      fireEvent.dragOver(sentCol);
      await act(async () => {
        fireEvent.drop(sentCol, { dataTransfer: mockDataTransfer });
      });
      expect(mockUpdate).toHaveBeenCalled();
    }
  });

  it('displays count badge on each Kanban column', async () => {
    await act(async () => {
      render(<CRMPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Drake')).toBeInTheDocument();
    });

    const badges = document.querySelectorAll('.bg-gray-200.text-gray-600.rounded-full');
    expect(badges.length).toBe(4);
  });
});
