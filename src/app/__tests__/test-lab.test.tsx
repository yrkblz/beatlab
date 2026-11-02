import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestLabPage from '../test/page';

describe('TestLabPage (/test)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders the core module: Pobieranie Oznaczonych Raperów z Postów i Rolek', () => {
    render(<TestLabPage />);

    expect(screen.getByText(/Test Lab & Outreach/i)).toBeInTheDocument();
    expect(screen.getByText(/Pobieranie Oznaczonych Raperów z Postów \/ Rolek/i)).toBeInTheDocument();
    expect(screen.queryByText(/2\. Unfollow Tracker/i)).not.toBeInTheDocument();
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
