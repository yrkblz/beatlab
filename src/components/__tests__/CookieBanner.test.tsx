import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CookieBanner from '../CookieBanner';

describe('CookieBanner Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'beathelper_cookie_consent=; path=/; max-age=0';
    jest.clearAllMocks();
  });

  it('renders cookie consent banner on first visit when consent is not stored', async () => {
    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.getByRole('region', { name: /cookie consent banner/i })).toBeInTheDocument();
    expect(screen.getByText(/Cookie Preferences & Compliance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cookie policy/i })).toHaveAttribute('href', '/cookies');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
  });

  it('stores accepted consent in localStorage and hides banner when Accept is clicked', async () => {
    await act(async () => {
      render(<CookieBanner />);
    });

    const acceptBtn = screen.getByRole('button', { name: /^accept$/i });
    expect(acceptBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(localStorage.getItem('beathelper_cookie_consent')).toBe('accepted');
    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();
  });

  it('does not render banner if user has already accepted cookies previously', async () => {
    localStorage.setItem('beathelper_cookie_consent', 'accepted');

    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();
  });

  it('does not render banner if accepted consent is stored in document.cookie', async () => {
    document.cookie = 'beathelper_cookie_consent=accepted; path=/';

    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();
  });

  it('falls back gracefully to document.cookie when localStorage throws an exception', async () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => {
      throw new Error('QuotaExceededError: storage disabled in private mode');
    });

    await act(async () => {
      render(<CookieBanner />);
    });

    const acceptBtn = screen.getByRole('button', { name: /^accept$/i });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    expect(document.cookie).toContain('beathelper_cookie_consent=accepted');
    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();

    localStorage.setItem = originalSetItem;
  });

  it('does not falsely consider similar cookie names as accepted consent', async () => {
    document.cookie = 'beathelper_cookie_consent_legacy=accepted; path=/';

    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.getByRole('region', { name: /cookie consent banner/i })).toBeInTheDocument();
  });

  it('hides banner when consent is accepted in another tab via storage event', async () => {
    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.getByRole('region', { name: /cookie consent banner/i })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'beathelper_cookie_consent',
          newValue: 'accepted',
        })
      );
    });

    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();
  });

  it('recognizes quoted cookie values from RFC 6265 compliant servers', async () => {
    document.cookie = 'beathelper_cookie_consent="accepted"; path=/';

    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();
  });

  it('correctly parses cookies when other cookies contain equal signs', async () => {
    document.cookie = 'auth_session=token=123=xyz; path=/';
    document.cookie = 'beathelper_cookie_consent=accepted; path=/';

    await act(async () => {
      render(<CookieBanner />);
    });

    expect(screen.queryByRole('region', { name: /cookie consent banner/i })).not.toBeInTheDocument();
  });
});
