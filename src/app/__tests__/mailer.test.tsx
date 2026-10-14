import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import MailerPage from '../mailer/page';
import { supabase } from '@/lib/supabase';

const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockDelete = jest.fn(() => ({ in: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })) }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { authListener: { subscription: { unsubscribe: jest.fn() } }, subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'campaigns') {
        return {
          select: mockSelect,
          delete: mockDelete,
        };
      }
      if (table === 'beats') {
        return {
          select: mockSelect,
        };
      }
      return {
        select: mockSelect,
      };
    }),
  },
}));

describe('Mailer Page (/mailer) Multi-Tenant Privacy & Isolation', () => {
  const mockUserA = {
    id: 'user-a-1111-2222',
    email: 'usera@example.com',
  };

  const mockSessionA = {
    user: mockUserA,
    provider_token: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ files: [] }),
    } as any);
  });

  it('renders login prompt for unauthenticated visitors', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    await act(async () => {
      render(<MailerPage />);
    });

    expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
    expect(screen.getByText(/You need to log in to access the E-mail Marketing tools/i)).toBeInTheDocument();
  });

  it('strictly filters campaign stats query by logged-in user_id', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSessionA },
    });

    const userACampaigns = [
      {
        id: 'camp-1',
        subject: 'User A Summer Pack',
        created_at: new Date().toISOString(),
        user_id: mockUserA.id,
        email_logs: [
          { id: 'log-1', recipient_email: 'rapper1@gmail.com', opened: true, opened_at: new Date().toISOString() },
        ],
      },
    ];

    mockOrder.mockResolvedValue({ data: userACampaigns, error: null });

    await act(async () => {
      render(<MailerPage />);
    });

    // Switch to Campaign Stats tab
    const statsTab = screen.getByText(/Campaign Stats/i);
    await act(async () => {
      fireEvent.click(statsTab);
    });

    // Assert supabase query specifically passed user_id = mockUserA.id
    expect(supabase.from).toHaveBeenCalledWith('campaigns');
    expect(mockSelect).toHaveBeenCalledWith('*, email_logs ( id, recipient_email, opened, opened_at )');
    expect(mockEq).toHaveBeenCalledWith('user_id', mockUserA.id);

    await waitFor(() => {
      expect(screen.getByText('User A Summer Pack')).toBeInTheDocument();
    });
  });

  it('strictly filters beats attachment list by logged-in user_id', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSessionA },
    });

    mockOrder.mockResolvedValue({
      data: [{ id: 'beat-a1', title: 'User A Trap Beat', file_url: 'https://example.com/a.mp3', user_id: mockUserA.id }],
      error: null,
    });

    await act(async () => {
      render(<MailerPage />);
    });

    expect(supabase.from).toHaveBeenCalledWith('beats');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', mockUserA.id);
  });

  it('returns empty campaigns list and does not leak data when error occurs', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSessionA },
    });

    // Simulate database error (e.g. missing column or network issue)
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'column campaigns.user_id does not exist' },
    });

    await act(async () => {
      render(<MailerPage />);
    });

    const statsTab = screen.getByText(/Campaign Stats/i);
    await act(async () => {
      fireEvent.click(statsTab);
    });

    await waitFor(() => {
      expect(screen.getByText(/No campaigns\./i)).toBeInTheDocument();
    });
  });
});
