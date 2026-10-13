import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrialExpiredModal from '../TrialExpiredModal';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('TrialExpiredModal Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <TrialExpiredModal isOpen={false} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with lifetime offer and English text when isOpen is true', () => {
    render(<TrialExpiredModal isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('trial-expired-modal')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Get Lifetime Access Forever/i })
    ).toBeInTheDocument();
    expect(screen.getByText('3-Day Free Trial Ended')).toBeInTheDocument();
    expect(screen.getByText(/BEATLAB Lifetime Pass/i)).toBeInTheDocument();
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Get Lifetime Access for \$29/i })
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(<TrialExpiredModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to /upgrade on checkout fallback or redirect', async () => {
    // Mock fetch failure to test fallback navigation
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <TrialExpiredModal
        isOpen={true}
        onClose={jest.fn()}
        userId="user-123"
        userEmail="test@example.com"
      />
    );

    const ctaBtn = screen.getByRole('button', {
      name: /Get Lifetime Access for \$29/i,
    });
    fireEvent.click(ctaBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/upgrade');
    });
  });
});
