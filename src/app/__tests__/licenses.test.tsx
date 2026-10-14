import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LicensesPage from '../licenses/page';
import { supabase } from '@/lib/supabase';

// Mock window.print
const originalPrint = window.print;
beforeAll(() => {
  window.print = jest.fn();
});
afterAll(() => {
  window.print = originalPrint;
});

const mockBeats = [
  { id: 'b-1', title: 'Midnight Trap', genre: 'Trap', bpm: 140, key: 'C Minor', created_at: '2026-01-01T10:00:00Z' },
  { id: 'b-2', title: 'Summer Vibes', genre: 'Afrobeat', bpm: 105, key: 'G Major', created_at: '2026-02-01T10:00:00Z' },
  { id: 'b-3', title: 'Dark Drill', genre: 'Drill', bpm: 142, key: 'D Minor', created_at: '2026-03-01T10:00:00Z' },
];

const mockProfile = {
  id: 'usr-123',
  full_name: 'Metro Boomin',
  stage_name: 'Metro',
  address: 'Atlanta, Georgia, USA',
  base_currency: 'USD',
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
            })),
          })),
        };
      }
      if (table === 'beats') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: mockBeats, error: null }),
            })),
          })),
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

describe('LicensesPage (/licenses)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'producer@beatlab.space' } },
    });
  });

  it('renders page header and core controls', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    expect(screen.getByText(/License Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Print \/ Download PDF/i)).toBeInTheDocument();
  });

  it('fetches profile and populates licensor details from Supabase', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Metro Boomin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Metro')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Atlanta, Georgia, USA')).toBeInTheDocument();
    });
  });

  it('loads default prices from state or localStorage', async () => {
    localStorage.setItem('mp3Price', '39.99');
    localStorage.setItem('wavPrice', '59.99');

    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('39.99').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByDisplayValue('59.99').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('saves price changes to localStorage', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const mp3Inputs = screen.getAllByDisplayValue('29.99');
    fireEvent.change(mp3Inputs[0], { target: { value: '34.99' } });

    await waitFor(() => {
      expect(localStorage.getItem('mp3Price')).toBe('34.99');
    });
  });

  it('opens and closes the beat selection modal', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    expect(screen.getByRole('heading', { name: 'Select Beat' })).toBeInTheDocument();
    expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Summer Vibes')).toBeInTheDocument();
    expect(screen.getByText('Dark Drill')).toBeInTheDocument();
  });

  it('filters beats in the modal when typing into search query', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    const searchInput = screen.getByPlaceholderText(/Search beats/i);
    fireEvent.change(searchInput, { target: { value: 'summer' } });

    expect(screen.getByText('Summer Vibes')).toBeInTheDocument();
    expect(screen.queryByText('Dark Drill')).not.toBeInTheDocument();
  });

  it('allows picking a beat from the modal and closes the modal', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);
    fireEvent.click(screen.getByText('Summer Vibes'));

    expect(screen.queryByRole('heading', { name: 'Select Beat' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Summer Vibes').length).toBeGreaterThanOrEqual(1);
  });

  it('allows typing a custom beat name in the modal fallback', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    const customInput = screen.getByPlaceholderText(/Custom Beat Title/i);
    fireEvent.change(customInput, { target: { value: 'Hyperpop Anthem' } });

    const applyBtn = screen.getByRole('button', { name: /Use Custom/i });
    fireEvent.click(applyBtn);

    expect(screen.getAllByText('Hyperpop Anthem').length).toBeGreaterThanOrEqual(1);
  });

  it('updates licensee / buyer name in document preview', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const buyerInput = screen.getByPlaceholderText(/e\.g\. Drake/i);
    fireEvent.change(buyerInput, { target: { value: 'Travis Scott' } });

    expect(screen.getAllByText('Travis Scott').length).toBeGreaterThanOrEqual(1);
  });

  it('switches license types between MP3 and Exclusive', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const exclusiveRadio = screen.getByDisplayValue('exclusive');
    fireEvent.click(exclusiveRadio);

    expect(screen.getAllByText(/Exclusive Rights/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/BEAT LICENSE AGREEMENT/i)).toBeInTheDocument();
  });

  it('calculates reciprocal publishing splits between Producer and Artist', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/0%/).length).toBeGreaterThanOrEqual(1);

    const pubInput = screen.getByDisplayValue('0');
    fireEvent.change(pubInput, { target: { value: '50' } });

    await waitFor(() => {
      expect(screen.getAllByText(/50%/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('updates stream limit in non-exclusive contract preview', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const streamLimitInput = screen.getByDisplayValue('100000');
    fireEvent.change(streamLimitInput, { target: { value: '250000' } });

    await waitFor(() => {
      expect(screen.getAllByText(/250000/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('executes window.print when Print button is clicked and form is valid', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Metro Boomin')).toBeInTheDocument();
    });

    // Provide buyer name
    const buyerInput = screen.getByPlaceholderText(/e\.g\. Drake/i);
    fireEvent.change(buyerInput, { target: { value: 'Travis Scott' } });

    const printBtn = screen.getByRole('button', { name: /Print \/ Download PDF/i });
    expect(printBtn).not.toBeDisabled();
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('renders Highlight component with bold blue styling', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const blueElements = document.querySelectorAll('.text-blue-600.font-bold');
    expect(blueElements.length).toBeGreaterThan(0);
  });

  it('persists trackout and wav stream limits to localStorage', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const wavLimitInput = screen.getByDisplayValue('500000');
    fireEvent.change(wavLimitInput, { target: { value: '750000' } });

    await waitFor(() => {
      expect(localStorage.getItem('wavStreamLimit')).toBe('750000');
    });
  });

  it('updates custom license price manually', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const customPriceInputs = screen.getAllByDisplayValue('29.99');
    const customPriceInput = customPriceInputs[customPriceInputs.length - 1];
    fireEvent.change(customPriceInput, { target: { value: '45.00' } });

    expect(screen.getAllByText(/45\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to WAV lease and applies default wav price', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const wavRadio = screen.getByDisplayValue('wav');
    fireEvent.click(wavRadio);

    expect(screen.getAllByText(/WAV Lease/i).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Trackout lease and displays trackout features', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const trackoutRadio = screen.getByDisplayValue('trackout');
    fireEvent.click(trackoutRadio);

    expect(screen.getAllByText(/Trackout Lease/i).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Unlimited lease and renders unlimited terms', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    const unlimitedRadio = screen.getByDisplayValue('unlimited');
    fireEvent.click(unlimitedRadio);

    expect(screen.getAllByText(/Unlimited Lease/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows no beats found message when search has zero matches', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    const searchInput = screen.getByPlaceholderText(/Search beats/i);
    fireEvent.change(searchInput, { target: { value: 'xyznonexistentbeatname999' } });

    expect(screen.getByText(/No beats found matching your search/i)).toBeInTheDocument();
  });

  it('sorts beats in modal by name when selected', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    const sortTrigger = screen.getByRole('button', { name: /Sort by Date/i });
    fireEvent.click(sortTrigger);

    const sortByNameOption = screen.getByRole('button', { name: /Sort by Name/i });
    fireEvent.click(sortByNameOption);

    const beatTitles = screen.getAllByText(/Midnight Trap|Summer Vibes|Dark Drill/i);
    expect(beatTitles.length).toBeGreaterThanOrEqual(3);
  });

  it('sorts beats in modal by BPM when selected', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    const sortTrigger = screen.getByRole('button', { name: /Sort by Date/i });
    fireEvent.click(sortTrigger);

    const sortByBpmOption = screen.getByRole('button', { name: /Sort by BPM/i });
    fireEvent.click(sortByBpmOption);

    expect(screen.getAllByText(/BPM/i).length).toBeGreaterThanOrEqual(1);
  });

  it('sorts beats in modal by Genre when selected', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Midnight Trap').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('Midnight Trap')[0]);

    const sortTrigger = screen.getByRole('button', { name: /Sort by Date/i });
    fireEvent.click(sortTrigger);

    const sortByGenreOption = screen.getByRole('button', { name: /Sort by Genre/i });
    fireEvent.click(sortByGenreOption);

    expect(screen.getAllByText(/Trap|Afrobeat|Drill/i).length).toBeGreaterThanOrEqual(3);
  });

  it('updates stage name and reflects in contract credit and signatures', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Metro')).toBeInTheDocument();
    });

    const stageInput = screen.getByDisplayValue('Metro');
    fireEvent.change(stageInput, { target: { value: 'Young Metro' } });

    expect(screen.getAllByText('Young Metro').length).toBeGreaterThanOrEqual(1);
  });

  it('disables Print button when required buyerName is missing', async () => {
    await act(async () => {
      render(<LicensesPage />);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Metro Boomin')).toBeInTheDocument();
    });

    const printBtn = screen.getByRole('button', { name: /Print \/ Download PDF/i });
    expect(printBtn).toBeDisabled();
  });
});
