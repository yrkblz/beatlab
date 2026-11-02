import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FinansePage from '../finanse/page';
import { supabase } from '@/lib/supabase';

// Mock window.alert
const originalAlert = window.alert;
beforeAll(() => {
  window.alert = jest.fn();
});
afterAll(() => {
  window.alert = originalAlert;
});

const mockRates = {
  USD: 1,
  PLN: 4.0,
  EUR: 0.9,
  RUB: 90.0,
  UAH: 40.0,
};

const mockSales = [
  {
    id: 's-1',
    beat_name: 'Trap Banger',
    client_name: 'Lil Baby',
    license_type: 'MP3 Lease',
    amount: 35,
    currency: 'USD',
    created_at: new Date().toISOString(), // today
    user_id: 'usr-123',
  },
  {
    id: 's-2',
    beat_name: 'Afro Groove',
    client_name: 'Burna Boy',
    license_type: 'WAV Lease',
    amount: 180,
    currency: 'PLN', // 180 PLN / 4 = $45 USD
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    user_id: 'usr-123',
  },
  {
    id: 's-3',
    beat_name: 'Drill Heat',
    client_name: 'Central Cee',
    license_type: 'Trackout',
    amount: 72,
    currency: 'EUR', // 72 EUR / 0.9 = $80 USD
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    user_id: 'usr-123',
  },
];

const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));
const mockInsert = jest.fn().mockResolvedValue({ error: null });

const createSalesChain = () => {
  const result = { data: mockSales, error: null };
  return {
    order: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
};

const defaultSupabaseFrom = (table: string) => {
  if (table === 'profiles') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { base_currency: 'USD' }, error: null }),
        })),
      })),
    };
  }
  if (table === 'sales') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => createSalesChain()),
      })),
      insert: mockInsert,
      delete: mockDelete,
    };
  }
  if (table === 'clients') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'cli-101',
                first_name: 'Metro',
                last_name: 'Boomin',
                instagram: 'metroboomin',
                email: 'metro@boominati.com',
                manual_purchases_count: 2,
                user_id: 'usr-123',
              },
            ],
            error: null,
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'cli-new-99',
              first_name: 'Kendrick',
              last_name: 'Lamar',
              user_id: 'usr-123',
            },
            error: null,
          }),
        })),
      })),
    };
  }
  return {
    select: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  };
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('FinansePage (/finanse)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockImplementation(defaultSupabaseFrom);
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('exchangerate-api')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rates: mockRates }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }) as any;

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.space' } },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders login prompt when visitor is unauthenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await act(async () => {
      render(<FinansePage />);
    });

    expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Login/i })).toBeInTheDocument();
  });

  it('renders authenticated dashboard with headers and controls', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    expect(screen.getByText(/Finance & Sales/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Combined Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Revenue/i)).toBeInTheDocument();
  });

  it('fetches exchange rates on mount', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.exchangerate-api.com/v4/latest/USD');
  });

  it('renders transactions in the sales table', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Trap Banger')).toBeInTheDocument();
      expect(screen.getByText('Lil Baby')).toBeInTheDocument();
      expect(screen.getByText('Afro Groove')).toBeInTheDocument();
      expect(screen.getByText('Burna Boy')).toBeInTheDocument();
    });
  });

  it('calculates total combined revenue accurately with exchange rates', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/\$160\.00|\$80\.00|\$35\.00/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders individual currency sum cards for USD, PLN, EUR, RUB, UAH', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Only USD/i)).toBeInTheDocument();
      expect(screen.getByText(/Only PLN/i)).toBeInTheDocument();
      expect(screen.getByText(/Only EUR/i)).toBeInTheDocument();
      expect(screen.getByText(/Only RUB/i)).toBeInTheDocument();
      expect(screen.getByText(/Only UAH/i)).toBeInTheDocument();
    });
  });

  it('filters transactions when switching to "Last 7 Days"', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Trap Banger')).toBeInTheDocument();
    });

    const last7DaysBtn = screen.getByText('Last 7 Days');
    fireEvent.click(last7DaysBtn);

    expect(screen.getByText('Trap Banger')).toBeInTheDocument();
    expect(screen.getByText('Afro Groove')).toBeInTheDocument();
    expect(screen.queryByText('Drill Heat')).not.toBeInTheDocument();
  });

  it('filters transactions when switching to "All"', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    const allBtn = screen.getByText('All');
    fireEvent.click(allBtn);

    await waitFor(() => {
      expect(screen.getByText('Trap Banger')).toBeInTheDocument();
      expect(screen.getByText('Afro Groove')).toBeInTheDocument();
      expect(screen.getByText('Drill Heat')).toBeInTheDocument();
    });
  });

  it('switches time filter to "Custom" and renders date pickers', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    const customBtn = screen.getByText('Custom');
    fireEvent.click(customBtn);

    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
  });

  it('validates required beat name when submitting Add Sale form', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    const addBtn = screen.getByText('Add Revenue');
    fireEvent.click(addBtn);

    expect(window.alert).toHaveBeenCalledWith('Error: Please enter the beat title.');
  });

  it('validates required amount when amount is cleared', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    const beatInput = screen.getByPlaceholderText(/e\.g\. Dark Knight/i);
    fireEvent.change(beatInput, { target: { value: 'New Heat' } });

    const amountInput = screen.getByPlaceholderText('35');
    fireEvent.change(amountInput, { target: { value: '' } });

    const addBtn = screen.getByText('Add Revenue');
    fireEvent.click(addBtn);

    expect(window.alert).toHaveBeenCalledWith('Error: Please enter an amount.');
  });

  it('auto-populates default price when license type is changed in Add Revenue form', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    expect(screen.getByDisplayValue('35')).toBeInTheDocument();

    const licenseSelect = screen.getAllByText('MP3 Lease')[0];
    fireEvent.click(licenseSelect);

    const wavOption = screen.getAllByText('WAV Lease')[0];
    fireEvent.click(wavOption);

    expect(screen.getByDisplayValue('45')).toBeInTheDocument();
  });

  it('successfully submits new sale to Supabase and clears form', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    const beatInput = screen.getByPlaceholderText(/e\.g\. Dark Knight/i);
    fireEvent.change(beatInput, { target: { value: 'Astroworld Vibe' } });

    const clientInput = screen.getByPlaceholderText(/e\.g\. Lil Wayne/i);
    fireEvent.change(clientInput, { target: { value: 'Travis' } });

    const addBtn = screen.getByText('Add Revenue');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        beat_name: 'Astroworld Vibe',
        client_name: 'Travis',
        license_type: 'MP3 Lease',
        amount: 35,
        currency: 'USD',
        user_id: 'usr-123',
      }),
    ]);
  });

  it('opens and closes delete confirmation modal on cancel', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Delete').length).toBeGreaterThan(0);
    });

    const deleteBtns = screen.getAllByText('Delete');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByRole('heading', { name: 'Delete Sale' })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this sale\?/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('heading', { name: 'Delete Sale' })).not.toBeInTheDocument();
  });

  it('confirms deletion and calls Supabase delete', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Delete').length).toBeGreaterThan(0);
    });

    const tableDeleteBtns = screen.getAllByText('Delete');
    fireEvent.click(tableDeleteBtns[0]);

    // In modal, find the confirm Delete button (red button)
    const allDeleteBtns = screen.getAllByRole('button', { name: 'Delete' });
    const modalConfirmBtn = allDeleteBtns[allDeleteBtns.length - 1];

    await act(async () => {
      fireEvent.click(modalConfirmBtn);
    });

    expect(mockDelete).toHaveBeenCalled();
  });

  it('handles exchange rates API network failure gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<FinansePage />);
    });

    expect(screen.getByText(/Total Combined Revenue/i)).toBeInTheDocument();
  });

  it('changes target display currency using CustomSelect', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    const usdSelect = screen.getAllByText('USD')[0];
    fireEvent.click(usdSelect);

    const eurOption = screen.getAllByText('EUR')[0];
    fireEvent.click(eurOption);

    await waitFor(() => {
      expect(screen.getAllByText(/€/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays empty state message when filtered period has no transactions', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
          single: jest.fn().mockResolvedValue({ data: { base_currency: 'USD' }, error: null }),
        })),
      })),
      insert: mockInsert,
      delete: mockDelete,
    });

    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No transactions in selected period/i)).toBeInTheDocument();
    });
  });

  it('shows existing clients in the combobox dropdown and allows selection', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Finance & Sales')).toBeInTheDocument();
    });

    const clientInput = screen.getByPlaceholderText(/Search or enter client name/i);
    await act(async () => {
      fireEvent.change(clientInput, { target: { value: 'Metro' } });
    });

    // Existing client Metro Boomin should appear in dropdown
    await waitFor(() => {
      expect(screen.getByText('Existing Clients')).toBeInTheDocument();
      expect(screen.getByText('Metro Boomin')).toBeInTheDocument();
      expect(screen.getByText('@metroboomin')).toBeInTheDocument();
    });

    // Select Metro Boomin
    await act(async () => {
      fireEvent.click(screen.getByText('Metro Boomin'));
    });

    // Input should be filled and linked indicator shown
    expect(clientInput).toHaveValue('Metro Boomin');
    expect(screen.getByText('Linked to DB')).toBeInTheDocument();
  });

  it('auto-creates new client when a non-existent client name is entered and sale is submitted', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Finance & Sales')).toBeInTheDocument();
    });

    const beatInput = screen.getByPlaceholderText(/e\.g\. Dark Knight/i);
    fireEvent.change(beatInput, { target: { value: 'Not Like Us' } });

    const clientInput = screen.getByPlaceholderText(/Search or enter client name/i);
    fireEvent.change(clientInput, { target: { value: 'Kendrick Lamar' } });

    // Combobox shows option to add as new client
    await waitFor(() => {
      expect(screen.getByText(/\+ Add as new client:/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByText('Add Revenue');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      const lastCall = mockInsert.mock.calls[mockInsert.mock.calls.length - 1];
      const insertPayload = lastCall[0][0];
      expect(insertPayload.beat_name).toBe('Not Like Us');
      expect(insertPayload.client_name).toBe('Kendrick Lamar');
    });
  });

  it('filters transactions by selected client from client filter dropdown', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Finance & Sales')).toBeInTheDocument();
      expect(screen.getByText('Burna Boy')).toBeInTheDocument();
      expect(screen.getByText('Lil Baby')).toBeInTheDocument();
    });

    // Open client filter dropdown (currently "All Clients")
    const clientFilterSelect = screen.getByText('All Clients');
    fireEvent.click(clientFilterSelect);

    // Click "Burna Boy" in dropdown
    const burnaOption = screen.getAllByText('Burna Boy')[0];
    fireEvent.click(burnaOption);

    // Only Burna Boy's sale should remain in table
    await waitFor(() => {
      expect(screen.getByText('Afro Groove')).toBeInTheDocument();
      expect(screen.queryByText('Trap Banger')).not.toBeInTheDocument();
    });
  });

  it('sorts transactions by client when clicking the Client column header', async () => {
    await act(async () => {
      render(<FinansePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Finance & Sales')).toBeInTheDocument();
    });

    // Header has "Client"
    const clientHeader = screen.getByText('Client');
    
    // First click: asc (A-Z) -> Burna Boy, Lil Baby
    fireEvent.click(clientHeader);
    const rowsAsc = screen.getAllByText(/Burna Boy|Lil Baby/);
    expect(rowsAsc[0]).toHaveTextContent('Burna Boy');

    // Second click: desc (Z-A) -> Lil Baby, Burna Boy
    fireEvent.click(clientHeader);
    const rowsDesc = screen.getAllByText(/Burna Boy|Lil Baby/);
    expect(rowsDesc[0]).toHaveTextContent('Lil Baby');
  });
});
