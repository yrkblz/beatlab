import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import MailerPage from '../mailer/page';
import { supabase } from '@/lib/supabase';

const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq, is: mockEq, order: mockOrder }));
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

  it('allows selecting all beats in catalog with Select All button', async () => {
    const mockSession = {
      user: mockUserA,
      provider_token: 'google-token-123',
    };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });

    mockOrder.mockResolvedValue({
      data: [
        { id: 'beat-1', title: 'Midnight Trap', file_url: 'https://example.com/1.mp3', user_id: mockUserA.id },
        { id: 'beat-2', title: 'Dark Melody', file_url: 'https://example.com/2.mp3', user_id: mockUserA.id }
      ],
      error: null,
    });

    await act(async () => {
      render(<MailerPage />);
    });

    // Check that Select All button exists in Beat Catalog
    await waitFor(() => {
      expect(screen.getByText(/2 beats available/i)).toBeInTheDocument();
    });

    const selectAllBtn = screen.getByRole('button', { name: /Select All/i });
    expect(selectAllBtn).toBeInTheDocument();

    // Click Select All
    await act(async () => {
      fireEvent.click(selectAllBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Deselect All/i })).toBeInTheDocument();
      expect(screen.getByText(/Attachments to download/i)).toBeInTheDocument();
    });

    // Click Deselect All
    const deselectBtn = screen.getByRole('button', { name: /Deselect All/i });
    await act(async () => {
      fireEvent.click(deselectBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Select All/i })).toBeInTheDocument();
      expect(screen.queryByText(/Attachments to download/i)).not.toBeInTheDocument();
    });
  });

  it('allows scheduling a campaign for later and viewing it in Scheduled Queue', async () => {
    const mockSession = {
      user: mockUserA,
      provider_token: 'google-token-123',
    };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });

    mockOrder.mockResolvedValue({ data: [], error: null });

    await act(async () => {
      render(<MailerPage />);
    });

    // Fill out form
    const recipientsInput = screen.getByPlaceholderText(/raper1@gmail.com/i);
    const campaignInput = screen.getByPlaceholderText(/e.g. Spring Beat Pack 2026/i);
    const subjectInput = screen.getByPlaceholderText(/e.g. 🔥 Exclusive Beat Pack/i);
    const bodyInput = screen.getByPlaceholderText(/Hey! Here are my latest beats.../i);

    fireEvent.change(recipientsInput, { target: { value: 'rapper@gmail.com' } });
    fireEvent.change(campaignInput, { target: { value: 'October Heat Pack' } });
    fireEvent.change(subjectInput, { target: { value: 'Exclusive beats for you' } });
    fireEvent.change(bodyInput, { target: { value: 'Listen to these new beats' } });

    // Toggle Schedule Send checkbox
    const scheduleToggle = screen.getByLabelText(/Schedule message for later/i);
    await act(async () => {
      fireEvent.click(scheduleToggle);
    });

    // Verify Schedule Campaign button is present
    expect(screen.getByRole('button', { name: /Schedule Campaign/i })).toBeInTheDocument();

    // Click Schedule Campaign button
    const scheduleBtn = screen.getByRole('button', { name: /Schedule Campaign/i });
    await act(async () => {
      fireEvent.click(scheduleBtn);
    });

    // Verify success status
    await waitFor(() => {
      expect(screen.getAllByText(/Campaign scheduled successfully!/i).length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Scheduled Queue tab
    const queueTab = screen.getByRole('button', { name: /Scheduled Queue/i });
    await act(async () => {
      fireEvent.click(queueTab);
    });

    // Check that campaign is listed in the queue
    await waitFor(() => {
      expect(screen.getByText('October Heat Pack')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });
  it('renders Attachments panel and Beat Catalog even when provider_token is null', async () => {
    localStorage.clear();
    const mockSessionNoGoogle = {
      user: mockUserA,
      provider_token: null,
    };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSessionNoGoogle },
    });

    mockOrder.mockResolvedValue({
      data: [
        { id: 'beat-x', title: 'Free Flowing Beat', file_url: 'https://example.com/free.mp3', user_id: mockUserA.id }
      ],
      error: null,
    });

    await act(async () => {
      render(<MailerPage />);
    });

    expect(screen.getByRole('heading', { name: /Attachments/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Free Flowing Beat')).toBeInTheDocument();
    });

    expect(screen.getByText(/Google Account not connected/i)).toBeInTheDocument();
  });
});
