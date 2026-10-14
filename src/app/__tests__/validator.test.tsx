import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ValidatorPage from '../validator/page';

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

describe('ValidatorPage (/validator)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (typeof url === 'string' && url.includes('/api/validate-email')) {
        const body = JSON.parse(options?.body || '{}');
        const results = (body.emails || []).map((email: string) => {
          if (email.includes('nonexistent')) {
            return { email, valid: false, reason: 'Domain not found' };
          }
          if (email.includes('nomailserver')) {
            return { email, valid: false, reason: 'No mail servers' };
          }
          return { email, valid: true };
        });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders page heading and instructions', () => {
    render(<ValidatorPage />);
    expect(screen.getByRole('heading', { name: 'Email Validator' })).toBeInTheDocument();
    expect(screen.getByText(/Clean your mailing lists/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Paste your emails/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument();
  });

  it('initially disables the "Validate List" button when textarea is empty', () => {
    render(<ValidatorPage />);
    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    expect(validateBtn).toBeDisabled();
  });

  it('displays empty results placeholder initially', () => {
    render(<ValidatorPage />);
    expect(screen.getByText(/Paste emails and run validation to see results here/i)).toBeInTheDocument();
  });

  it('enables the validate button when emails are entered', () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, { target: { value: 'producer@beatlab.space' } });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    expect(validateBtn).not.toBeDisabled();
  });

  it('identifies bad formats without calling backend API', async () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, { target: { value: 'invalid-email-string, hello@world.com' } });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText('invalid-email-string').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });
  });

  it('deduplicates repetitive emails in input text', async () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, {
      target: { value: 'dupe@gmail.com, dupe@gmail.com\ndupe@gmail.com' },
    });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Valid Emails')).toBeInTheDocument();
    });

    // Valid count should be 1, not 3
    const validCount = screen.getByText('1');
    expect(validCount).toBeInTheDocument();
  });

  it('categorizes domains without mail servers as invalid', async () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, {
      target: { value: 'artist@nomailserver.org, valid@beatlab.space' },
    });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText('artist@nomailserver.org').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('No mail servers')).toBeInTheDocument();
      expect(screen.getAllByText('valid@beatlab.space').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('categorizes non-existent domains as invalid', async () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, {
      target: { value: 'fake@nonexistent.xyz' },
    });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText('fake@nonexistent.xyz').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Domain not found')).toBeInTheDocument();
    });
  });

  it('allows copying clean list to clipboard', async () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, {
      target: { value: 'clean1@beatlab.space, clean2@beatlab.space' },
    });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy Valid/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy Valid/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'clean1@beatlab.space, clean2@beatlab.space'
    );
    expect(window.alert).toHaveBeenCalledWith('Copied valid emails to clipboard!');
  });

  it('provides a download button for clean list', async () => {
    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, {
      target: { value: 'producer@beatlab.space' },
    });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download \.txt/i })).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /Download \.txt/i });
    expect(downloadBtn).toBeInTheDocument();
  });

  it('falls back gracefully to mark syntax-valid emails as valid when backend API fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

    render(<ValidatorPage />);
    const textarea = screen.getByPlaceholderText(/producer1@gmail\.com/i);
    fireEvent.change(textarea, {
      target: { value: 'fallback@beatlab.space' },
    });

    const validateBtn = screen.getByRole('button', { name: /Validate List/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText('fallback@beatlab.space').length).toBeGreaterThanOrEqual(1);
    });
  });
});
