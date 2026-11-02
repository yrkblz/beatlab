import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ClientsPage from '../clients/page';
import { supabase } from '@/lib/supabase';

// Mock Next navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => null),
  })),
}));

const mockClients = [
  {
    id: 'cli-1',
    user_id: 'usr-123',
    first_name: 'Metro',
    last_name: 'Boomin',
    email: 'metro@boominati.com',
    instagram: 'metroboomin',
    manual_purchases_count: 2,
    notes: 'Key industry contact',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'cli-2',
    user_id: 'usr-123',
    first_name: 'Future',
    last_name: 'Hendrix',
    email: 'future@freebandz.com',
    instagram: 'future',
    manual_purchases_count: 5,
    notes: 'Major artist',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const mockSales = [
  {
    id: 's-1',
    beat_name: 'Superhero',
    client_name: 'Metro Boomin',
    client_id: 'cli-1',
    license_type: 'Exclusive',
    amount: 500,
    currency: 'USD',
    created_at: new Date().toISOString(),
    user_id: 'usr-123',
  },
];

const mockDeleteEqUser = jest.fn().mockResolvedValue({ error: null });
const mockDeleteEqId = jest.fn(() => ({ eq: mockDeleteEqUser }));
const mockDelete = jest.fn(() => ({ eq: mockDeleteEqId }));

const mockInsertSingle = jest.fn().mockResolvedValue({
  data: {
    id: 'cli-3',
    user_id: 'usr-123',
    first_name: 'Travis',
    last_name: 'Scott',
    email: 'trav@cactus.jack',
    instagram: 'travisscott',
    manual_purchases_count: 1,
    notes: 'Houston artist',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  error: null,
});

const mockInsertSelect = jest.fn(() => ({ single: mockInsertSingle }));
const mockInsert = jest.fn(() => ({ select: mockInsertSelect }));

const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn(() => ({
    eq: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'cli-1',
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      })),
    })),
  })),
});

const createSalesQueryChain = () => {
  const result = { data: mockSales, error: null };
  return {
    order: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn((table: string) => {
      if (table === 'sales') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => createSalesQueryChain()),
          })),
        };
      }
      if (table === 'clients') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: mockClients, error: null }),
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

describe('ClientsPage (/clients)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders login prompt when visitor is unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    render(<ClientsPage />);

    expect(screen.getByText(/Checking authentication.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
      expect(screen.getByText(/You need to log in to view and manage your clients/i)).toBeInTheDocument();
    });
  });

  test('renders authenticated clients dashboard with metrics and client list', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.io' } },
    });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Clients' })).toBeInTheDocument();
      expect(screen.getByText(/Baza artystów i wykonawców/i)).toBeInTheDocument();
    });

    // Metro Boomin: 2 manual + 1 sale = 3 total
    // Future Hendrix: 5 manual + 0 sales = 5 total
    await waitFor(() => {
      expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
      expect(screen.getByText('Future Hendrix')).toBeInTheDocument();
      expect(screen.getByText('@metroboomin')).toBeInTheDocument();
      expect(screen.getByText('@future')).toBeInTheDocument();
      expect(screen.getByText('metro@boominati.com')).toBeInTheDocument();
    });

    // Check compact counter in header
    expect(screen.getByText(/2 klientów/i)).toBeInTheDocument();
  });

  test('filters clients by search query', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.io' } },
    });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
      expect(screen.getByText('Future Hendrix')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwisku, IG lub emailu/i);
    fireEvent.change(searchInput, { target: { value: 'metro' } });

    expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
    expect(screen.queryByText('Future Hendrix')).not.toBeInTheDocument();
  });

  test('opens Add Client modal, fills fields, and saves a new client', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.io' } },
    });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dodaj Klienta' })).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: 'Dodaj Klienta' });
    fireEvent.click(addBtn);

    expect(screen.getByText('Dodaj Nowego Klienta')).toBeInTheDocument();

    const firstNameInput = screen.getByPlaceholderText('np. Travis');
    const lastNameInput = screen.getByPlaceholderText('np. Scott');
    const igInput = screen.getByPlaceholderText('travisscott');
    const emailInput = screen.getByPlaceholderText('contact@artist.com');

    fireEvent.change(firstNameInput, { target: { value: 'Travis' } });
    fireEvent.change(lastNameInput, { target: { value: 'Scott' } });
    fireEvent.change(igInput, { target: { value: 'travisscott' } });
    fireEvent.change(emailInput, { target: { value: 'trav@cactus.jack' } });

    const submitBtn = screen.getByRole('button', { name: /Zapisz nowego klienta/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  test('opens purchase history modal for a client and displays sales transactions', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.io' } },
    });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
    });

    // Metro Boomin has 2 manual + 1 sale = 3 total beats
    const historyBadge = screen.getByRole('button', { name: /3 bitów/i });
    await act(async () => {
      fireEvent.click(historyBadge);
    });

    await waitFor(() => {
      expect(screen.getByText(/Historia Zakupów:/i)).toBeInTheDocument();
      expect(screen.getByText('Superhero')).toBeInTheDocument();
      expect(screen.getByText(/500 USD/i)).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Zamknij/i });
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText(/Historia Zakupów:/i)).not.toBeInTheDocument();
  });

  test('opens delete confirmation modal and removes client', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.io' } },
    });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
      expect(screen.getByText('Future Hendrix')).toBeInTheDocument();
    });

    // Future Hendrix is top sorted (5 beats), Metro Boomin is second (3 beats)
    const deleteButtons = screen.getAllByTitle('Usuń klienta');
    // Click delete on Metro Boomin (index 1)
    await act(async () => {
      fireEvent.click(deleteButtons[1]);
    });

    expect(screen.getByText(/Usunąć klienta\?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Metro Boomin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Wszystkie dotychczasowe transakcje w module Finanse pozostaną nienaruszone/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /Tak, usuń klienta/i });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteEqId).toHaveBeenCalledWith('id', 'cli-1');
      expect(mockDeleteEqUser).toHaveBeenCalledWith('user_id', 'usr-123');
    });
  });
});
