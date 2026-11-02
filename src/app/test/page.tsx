'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FlaskConical,
  Music,
  Send,
    Search,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Settings,
  HelpCircle,
  Video,
  Key,
  Sparkles,
} from 'lucide-react';

interface FoundArtist {
  handle: string;
  fullName: string;
  bio: string;
  followers: number;
  profileUrl: string;
  musicLinks: string[];
  musicPlatforms?: string[];
  email?: string;
  sourceContext?: string;
}

const IG_ACCOUNT_CONFIG_KEY = 'beatlab_ig_active_account_config_v1';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // fallback to execCommand
  }
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export default function TestLabPage() {
  // --- ACCOUNT & SESSION SETTINGS (Wybór konta do akcji) ---
  const [activeAccount, setActiveAccount] = useState('yrkblz');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSessionHelp, setShowSessionHelp] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // --- POBIERANIE OZNACZONYCH RAPERÓW Z POSTÓW ---
  const [artistSource, setArtistSource] = useState('https://www.instagram.com/p/DYfHpJfRgp6/');
  const [artistMode, setArtistMode] = useState<'auto' | 'posts' | 'following' | 'followers'>('auto');
  const [artistLimit, setArtistLimit] = useState(25);
  const [filterOnlyMusic, setFilterOnlyMusic] = useState(true);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState('');
  const [foundArtists, setFoundArtists] = useState<FoundArtist[]>([]);

  // Load stored state on mount
  useEffect(() => {
    try {
      // 1. Account Settings
      const storedAccount = localStorage.getItem(IG_ACCOUNT_CONFIG_KEY);
      if (storedAccount) {
        const parsed = JSON.parse(storedAccount);
        if (parsed.username) {
          setActiveAccount(parsed.username);
          }
        if (parsed.sessionId) setActiveSessionId(parsed.sessionId);
      }
    } catch (e) {
      console.error('Error loading localStorage:', e);
    }
  }, []);

  const handleSaveAccountConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = activeAccount.trim().replace(/^@/, '');
    setActiveAccount(cleanUser);
    localStorage.setItem(
      IG_ACCOUNT_CONFIG_KEY,
      JSON.stringify({ username: cleanUser, sessionId: activeSessionId.trim() })
    );
    setSettingsSavedNotice(true);
    setTimeout(() => {
      setSettingsSavedNotice(false);
      setShowAccountSettings(false);
    }, 1500);
  };

  // 1. FETCH ARTISTS (Z POSTÓW / KANAŁÓW / ROLEK)
  async function handleFetchArtists(e: React.FormEvent) {
    e.preventDefault();
    if (!artistSource.trim()) return;

    setArtistLoading(true);
    setArtistError('');

    try {
      // Auto-detect mode if post URL is provided
      let modeToSend = artistMode;
      if (artistMode === 'auto') {
        modeToSend = artistSource.includes('/p/') || artistSource.includes('/reel/') ? 'posts' : 'posts';
      }

      const res = await fetch('/api/instagram-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: artistSource.trim(),
          mode: modeToSend,
          limit: artistLimit,
          roleFilters: ['artist'],
          onlyWithContact: false,
          filterOnlyArtists: filterOnlyMusic,
          customSessionId: activeSessionId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan artists.');

      const artists: FoundArtist[] = (data.leads || []).map((lead: any) => ({
        handle: lead.handle.replace(/^@/, ''),
        fullName: lead.fullName || lead.handle,
        bio: lead.bio || '',
        followers: lead.followers || 0,
        profileUrl: lead.profileUrl,
        musicLinks: lead.publicLinks || [],
        musicPlatforms: lead.musicPlatforms || [],
        email: lead.email,
        sourceContext: lead.sourceContext || (lead.bio?.includes('Występuje') ? lead.bio : undefined),
      }));

      setFoundArtists(artists);
      if (artists.length === 0) {
        setArtistError(
          `Nie znaleziono oznaczonych raperów dla "${artistSource}". Upewnij się, że post zawiera oznaczenia wykonawców (@mention) lub podaj inne wideo.`
        );
      }
    } catch (err: any) {
      setArtistError(err.message || 'Wystąpił błąd podczas pobierania oznaczonych artystów.');
    } finally {
      setArtistLoading(false);
    }
  }

  function handleOpenDirectChat(artist: FoundArtist) {
    window.open(`https://ig.me/m/${artist.handle}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-gray-900 pb-20">
      {/* Header */}
      <div className="border-b border-[#d2d2d7] bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <FlaskConical size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                  Test Lab & Outreach
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    BETA
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Oznaczeni raperzy z postów & rolek • Bezpieczna wysyłka DM (~40/dzień)
                </p>
              </div>
            </div>

            {/* Account & Limits Control Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowAccountSettings(!showAccountSettings)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold border border-gray-200 transition-all"
                title="Wybierz konto do sprawdzania odobserwowań"
              >
                <Settings size={14} className="text-gray-500" />
                <span>Konto do akcji:</span>
                <span className="text-blue-700 font-bold">@{activeAccount || 'Nie ustawiono'}</span>
              </button>
            </div>
          </div>

          {/* Account Settings Drawer / Modal */}
          {showAccountSettings && (
            <div className="mt-4 p-5 rounded-2xl bg-gray-50 border border-gray-300 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Key size={16} className="text-blue-600" />
                  Wybierz konto Instagram (do wysyłki DM i Unfollow)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSessionHelp(!showSessionHelp)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <HelpCircle size={14} />
                  Jak pobrać sessionid z przeglądarki?
                </button>
              </div>

              {showSessionHelp && (
                <div className="mb-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold mb-1">Jak pobrać sessionid w 15 sekund:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Otwórz stronę <strong>instagram.com</strong> w Chrome/Edge i zaloguj się na swoje konto.</li>
                    <li>Wciśnij <strong>F12</strong> (Narzędzia programistyczne) i przejdź do zakładki <strong>Application</strong> (lub <em>Aplikacja</em>).</li>
                    <li>W menu po lewej rozwiń <strong>Cookies</strong> i kliknij <strong>https://www.instagram.com</strong>.</li>
                    <li>Znajdź w tabeli wiersz o nazwie <strong>sessionid</strong>, kliknij dwukrotnie w pole wartości i skopiuj ten ciąg znaków.</li>
                    <li>Wklej poniżej i kliknij <em>Zapisz konto</em>.</li>
                  </ol>
                </div>
              )}

              <form onSubmit={handleSaveAccountConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Twoja nazwa konta (Handle)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      value={activeAccount}
                      onChange={(e) => setActiveAccount(e.target.value)}
                      placeholder="e.g. yrkblz"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Twój Session ID (opcjonalnie do automatycznych akcji)
                    </label>
                    <input
                      type="password"
                      value={activeSessionId}
                      onChange={(e) => setActiveSessionId(e.target.value)}
                      placeholder="Wklej sessionid z ciasteczek przeglądarki"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all mt-auto shrink-0"
                  >
                    {settingsSavedNotice ? 'Zapisano!' : 'Zapisz konto'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ========================================================= */}
        {/* TAB 1: OZNACZENI RAPERZY Z POSTÓW & ROLEK                */}
        {/* ========================================================= */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#d2d2d7] shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Video size={20} className="text-blue-600" />
                Pobieranie Oznaczonych Raperów z Postów / Rolek (Performance Series)
              </h2>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Wklej link do konkretnego posta/rolki (np.{' '}
                <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                  https://www.instagram.com/p/DYfHpJfRgp6/
                </code>
                ) lub kanału z występami raperów (np.{' '}
                <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">@thecomeupdvd</code>,{' '}
                <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">@ontheradarradio</code>). System wyciąga
                <strong> wyłącznie oznaczonych w poście raperów</strong> i bada ich profil.
              </p>

              <form onSubmit={handleFetchArtists} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Link do posta / rolki LUB nazwa kanału
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        @
                      </span>
                      <input
                        type="text"
                        value={artistSource}
                        onChange={(e) => setArtistSource(e.target.value)}
                        placeholder="e.g. https://www.instagram.com/p/DYfHpJfRgp6/ lub @thecomeupdvd"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tryb ekstrakcji</label>
                    <select
                      value={artistMode}
                      onChange={(e: any) => setArtistMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="auto">Wykryj automatycznie (Post lub Kanał)</option>
                      <option value="posts">Oznaczeni w postach i rolkach</option>
                      <option value="following">Obserwowani kanału (Following)</option>
                      <option value="followers">Obserwujący kanału (Followers)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none bg-blue-50/70 hover:bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200/70 transition-all">
                    <input
                      type="checkbox"
                      checked={filterOnlyMusic}
                      onChange={(e) => setFilterOnlyMusic(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <Sparkles size={14} className="text-blue-600" />
                    <span className="font-semibold text-blue-950">
                      Tylko zweryfikowani wykonawcy z muzyką (Spotify / Apple Music / SoundCloud / Bio)
                    </span>
                    <span className="text-[11px] text-blue-700">
                      (odrzuca producentów bitów, kamerzystów i profile prywatne)
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>Limit wyników:</span>
                    {[10, 25, 50, 100].map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setArtistLimit(l)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          artistLimit === l
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={artistLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    {artistLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Szukanie od najnowszych postów (cel: {artistLimit})...
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        Pobierz Oznaczonych Raperów
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  ⚡ Wyszukiwanie zaczyna się od najnowszych postów i rolek. System bada kolejne publikacje bez przerwy, dopóki nie uzbiera wybranego limitu ({artistLimit}) oznaczonych wykonawców.
                </p>
              </form>

              {artistError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {artistError}
                </div>
              )}
            </div>

            {/* Results List */}
            {foundArtists.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-[#d2d2d7] shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Znalezieni Oznaczeni Wykonawcy ({foundArtists.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Raperzy oznaczeni w poście/rolkach (przeszukano chronologicznie od najnowszych publikacji).
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {foundArtists.map((artist) => (
                    <div
                      key={artist.handle}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={artist.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-gray-900 hover:text-blue-600 text-sm flex items-center gap-1.5"
                          >
                            @{artist.handle}
                            <ExternalLink size={13} className="text-gray-400" />
                          </a>
                          <span className="text-xs text-gray-400">• {artist.fullName}</span>
                          {artist.followers > 0 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {artist.followers.toLocaleString()} obs.
                            </span>
                          )}
                        </div>

                        {artist.sourceContext && (
                          <div className="mt-1 text-[11px] font-medium text-blue-700">
                            {artist.sourceContext}
                          </div>
                        )}

                        {artist.musicPlatforms && artist.musicPlatforms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {artist.musicPlatforms.map((platform) => (
                              <span
                                key={platform}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
                              >
                                <Music size={10} />
                                {platform}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{artist.bio || 'Brak opisu bio'}</p>

                        {artist.musicLinks.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {artist.musicLinks.slice(0, 3).map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:underline max-w-[240px] truncate"
                              >
                                <Music size={11} />
                                {link.replace(/^https?:\/\/(www\.)?/, '')}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={artist.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold transition-all"
                        >
                          <ExternalLink size={13} />
                          Profil
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenDirectChat(artist)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-all"
                          title="Otwiera bezpośredni czat ig.me"
                        >
                          <Send size={13} />
                          Czat (ig.me)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

      </div>
    </div>
  );
}
