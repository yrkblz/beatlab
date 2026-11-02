import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestLabPage from '../test/page';

describe('TestLabPage (/test)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders the core modules: Pobieranie Artystów and Unfollow Tracker', () => {
    render(<TestLabPage />);

    expect(screen.getByText(/Test Lab & Outreach/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Oznaczeni Raperzy/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Unfollow Tracker/i)).toBeInTheDocument();
    expect(screen.queryByText(/Wysyłanie DM/i)).not.toBeInTheDocument();
  });

  it('switches between tabs cleanly', () => {
    render(<TestLabPage />);

    // Switch to Unfollow tab
    const unfollowTabBtn = screen.getByRole('button', { name: /2\. Unfollow Tracker/i });
    fireEvent.click(unfollowTabBtn);

    expect(screen.getByText(/Import z Instagrama \(JSON\)/i)).toBeInTheDocument();

    // Switch to Live API scan mode
    const liveScanBtn = screen.getByRole('button', { name: /Skan na żywo \(API\)/i });
    fireEvent.click(liveScanBtn);

    expect(screen.getByPlaceholderText(/Wpisz swój Instagram handle/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sprawdź odobserwowania/i })).toBeInTheDocument();
  });

  it('fetches artists and displays their profile and chat links', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leads: [
          {
            handle: '@centralcee',
            fullName: 'Central Cee',
            bio: 'Artist with Spotify links',
            followers: 120000,
            profileUrl: 'https://instagram.com/centralcee',
            publicLinks: ['https://open.spotify.com/artist/123'],
          },
        ],
      }),
    });

    render(<TestLabPage />);

    const searchBtn = screen.getByRole('button', { name: /Pobierz Oznaczonych Raperów/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/@centralcee/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Profil/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Czat \(ig\.me\)/i })).toBeInTheDocument();
    });
  });
});
