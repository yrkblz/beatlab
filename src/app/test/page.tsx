'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FlaskConical,
  Music,
  Send,
  UserX,
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
  FileText,
  UploadCloud,
  Sparkles,
} from 'lucide-react';
import { compareInstagramExportData } from '@/lib/instagram-data-importer';

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

interface UnfollowerAccount {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl?: string;
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
  const [activeTab, setActiveTab] = useState<'artists' | 'unfollow'>('artists');

  // --- ACCOUNT & SESSION SETTINGS (Wybór konta do akcji) ---
  const [activeAccount, setActiveAccount] = useState('yrkblz');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSessionHelp, setShowSessionHelp] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // --- TAB 1: POBIERANIE OZNACZONYCH RAPERÓW Z POSTÓW ---
  const [artistSource, setArtistSource] = useState('https://www.instagram.com/p/DYfHpJfRgp6/');
  const [artistMode, setArtistMode] = useState<'auto' | 'posts' | 'following' | 'followers'>('auto');
  const [artistLimit, setArtistLimit] = useState(25);
  const [filterOnlyMusic, setFilterOnlyMusic] = useState(true);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState('');
  const [foundArtists, setFoundArtists] = useState<FoundArtist[]>([]);

  // --- TAB 2: UNFOLLOW & TRACKER ---
  const [unfollowMode, setUnfollowMode] = useState<'export' | 'live'>('export');
  const [myUsername, setMyUsername] = useState('yrkblz');
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const [unfollowError, setUnfollowError] = useState('');
  const [isCheckpointError, setIsCheckpointError] = useState(false);
  const [partialScanNotice, setPartialScanNotice] = useState<string | null>(null);
  const [followersFileName, setFollowersFileName] = useState('');
  const [followingFileName, setFollowingFileName] = useState('');
  const [followersFileContent, setFollowersFileContent] = useState('');
  const [followingFileContent, setFollowingFileContent] = useState('');
  const [importSuccessNotice, setImportSuccessNotice] = useState('');
  const [notFollowingBack, setNotFollowingBack] = useState<UnfollowerAccount[]>([]);
  const [unfollowedYou, setUnfollowedYou] = useState<string[]>([]);
  const [fans, setFans] = useState<UnfollowerAccount[]>([]);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());
  const [unfollowedSuccessIds, setUnfollowedSuccessIds] = useState<Set<string>>(new Set());
  const [accountStats, setAccountStats] = useState<{ followers: number; following: number } | null>(null);

  // Load stored state on mount
  useEffect(() => {
    try {
      // 1. Account Settings
      const storedAccount = localStorage.getItem(IG_ACCOUNT_CONFIG_KEY);
      if (storedAccount) {
        const parsed = JSON.parse(storedAccount);
        if (parsed.username) {
          setActiveAccount(parsed.username);
          setMyUsername(parsed.username);
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
    setMyUsername(cleanUser);
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

  // Handle file uploads for official Instagram Export
  function handleFollowersFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFollowersFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFollowersFileContent(content);
      if (followingFileContent) {
        processComparison(content, followingFileContent);
      }
    };
    reader.readAsText(file);
  }

  function handleFollowingFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFollowingFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFollowingFileContent(content);
      if (followersFileContent) {
        processComparison(followersFileContent, content);
      }
    };
    reader.readAsText(file);
  }

  function processComparison(followersRaw: string, followingRaw: string) {
    try {
      setUnfollowError('');
      setPartialScanNotice(null);
      const res = compareInstagramExportData(followersRaw, followingRaw);
      setNotFollowingBack(
        res.notFollowingBack.map((u) => ({
          id: u.username,
          username: u.username,
          fullName: u.fullName,
        }))
      );
      setFans(
        res.fans.map((u) => ({
          id: u.username,
          username: u.username,
          fullName: u.fullName,
        }))
      );
      setAccountStats({
        followers: res.totalFollowers,
        following: res.totalFollowing,
      });
      setImportSuccessNotice(
        `Pomyślnie zaimportowano! Przeanalizowano ${res.totalFollowers} obserwujących i ${res.totalFollowing} obserwowanych. 100% dokładności bez limitów Instagrama.`
      );
    } catch (err: any) {
      setUnfollowError(`Błąd podczas odczytu plików: ${err.message}`);
    }
  }

  // 3. UNFOLLOW TRACKER: ANALYZE ACCOUNT
  async function handleAnalyzeUnfollowers(e: React.FormEvent) {
    e.preventDefault();
    const targetUser = (myUsername || activeAccount).trim().replace(/^@/, '');
    if (!targetUser) return;

    if (!activeSessionId.trim()) {
      setShowAccountSettings(true);
      setShowSessionHelp(true);
      setUnfollowError('Brak aktywnego Session ID. Wklej swój sessionid z ciasteczek Instagrama w panelu powyżej, aby przeanalizować obserwujących.');
      return;
    }

    setUnfollowLoading(true);
    setUnfollowError('');
    setIsCheckpointError(false);
    setPartialScanNotice(null);

    try {
      const res = await fetch('/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_unfollowers',
          username: targetUser,
          currentAccount: activeAccount.trim() || undefined,
          customSessionId: activeSessionId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'CHECKPOINT_REQUIRED' || data.error?.includes('checkpoint_required')) {
          setIsCheckpointError(true);
        }
        throw new Error(data.error || 'Błąd podczas analizy profilu.');
      }

      setNotFollowingBack(data.notFollowingBack || []);
      setFans(data.fans || []);
      setUnfollowedYou(data.unfollowedYou || []);
      setAccountStats({
        followers: data.account?.totalFollowers || 0,
        following: data.account?.totalFollowing || 0,
      });
      if (data.isPartialScan) {
        setPartialScanNotice(
          data.partialScanReason ||
            `Instagram ograniczył pobieranie listy (pobrano ${data.scannedFollowersCount} z ${data.account?.totalFollowers || '?'} obserwujących). Ze względów bezpieczeństwa nie oznaczamy niezweryfikowanych osób jako 'nie obserwujących zwrotnie', aby nie odobserwować prawdziwych znajomych. Użyj opcji 'Import danych z Instagrama' dla 100% dokładności.`
        );
      } else {
        setPartialScanNotice(null);
      }
    } catch (err: any) {
      setUnfollowError(err.message || 'Nie udało się pobrać danych profilu.');
    } finally {
      setUnfollowLoading(false);
    }
  }

  // Unfollow action
  async function handleUnfollow(targetUser: UnfollowerAccount) {
    setUnfollowingIds((prev) => new Set([...prev, targetUser.id]));

    try {
      const res = await fetch('/api/instagram-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unfollow',
          userId: targetUser.id,
          username: targetUser.username,
          customSessionId: activeSessionId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUnfollowedSuccessIds((prev) => new Set([...prev, targetUser.id]));
        setTimeout(() => {
          setNotFollowingBack((prev) => prev.filter((u) => u.id !== targetUser.id));
        }, 1200);
      } else {
        alert(data.error || `Nie udało się odobserwować @${targetUser.username}.`);
      }
    } catch (err: any) {
      alert(`Błąd: ${err.message}`);
    } finally {
      setUnfollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
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
                  Oznaczeni raperzy z postów & rolek • Bezpieczna wysyłka DM (~40/dzień) • Unfollow Tracker
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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 border-t border-gray-100 pt-3">
            <button
              onClick={() => setActiveTab('artists')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'artists'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Video size={16} />
              1. Oznaczeni Raperzy z Postów & Rolek
              {foundArtists.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                  {foundArtists.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('unfollow')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'unfollow'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <UserX size={16} />
              2. Unfollow Tracker
              {notFollowingBack.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
                  {notFollowingBack.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ========================================================= */}
        {/* TAB 1: OZNACZENI RAPERZY Z POSTÓW & ROLEK                */}
        {/* ========================================================= */}
        {activeTab === 'artists' && (
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
        )}

        {/* ========================================================= */}
        {/* TAB 2: UNFOLLOW TRACKER                                   */}
        {/* ========================================================= */}
        {activeTab === 'unfollow' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#d2d2d7] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <UserX size={20} className="text-amber-600" />
                    Unfollow Tracker (Kto Cię odobserwował)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Sprawdza kto nie obserwuje Cię zwrotnie oraz kto przestał Cię obserwować dla konta{' '}
                    <strong className="text-gray-900">@{activeAccount || 'yrkblz'}</strong>.
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setUnfollowMode('export')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      unfollowMode === 'export'
                        ? 'bg-white text-gray-950 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText size={13} className="text-amber-600" />
                    Import z Instagrama (JSON)
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                      100% Pewne
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnfollowMode('live')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      unfollowMode === 'live'
                        ? 'bg-white text-gray-950 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <RefreshCw size={12} className="text-blue-600" />
                    Skan na żywo (API)
                  </button>
                </div>
              </div>

              {/* MODE 1: EXPORT FILE IMPORT (100% ACCURACY, ZERO RISK) */}
              {unfollowMode === 'export' && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs leading-relaxed space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Sparkles size={16} className="text-amber-600" />
                      Najdokładniejsza metoda: zero fałszywych odobserwowań, zero limitów i zero ryzyka dla konta
                    </div>
                    <p className="text-amber-900/90">
                      Instagram blokuje pobieranie dużej liczby obserwowanych przez zewnętrzne API, co powodowało fałszywe oznaczanie Twoich prawdziwych znajomych. Oficjalny eksport danych z Instagrama zawiera 100% Twojej listy i daje natychmiastowy, w 100% bezbłędny wynik.
                    </p>
                    <div className="pt-1 text-[11px] text-amber-800 space-y-1">
                      <span className="font-bold block text-amber-900">Jak pobrać plik z Instagrama w 1 minutę:</span>
                      <ol className="list-decimal pl-5 space-y-0.5">
                        <li>W Instagramie przejdź: <em>Ustawienia → Centrum kont → Twoje informacje i uprawnienia → Pobierz swoje informacje</em>.</li>
                        <li>Wybierz <em>Pobierz na urządzenie → Obserwujący i obserwowani</em>, Format: <strong>JSON</strong>.</li>
                        <li>Po pobraniu archiwum ZIP wskaż poniżej pliki <strong>followers_1.json</strong> oraz <strong>following.json</strong>:</li>
                      </ol>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Followers File */}
                    <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-amber-400 transition-all text-center">
                      <UploadCloud size={24} className="mx-auto text-amber-600 mb-2" />
                      <label className="block text-xs font-bold text-gray-800 mb-1 cursor-pointer">
                        1. Wskaż plik followers_1.json (Obserwujący)
                        <input
                          type="file"
                          accept=".json,.html"
                          onChange={handleFollowersFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-gray-500 block truncate">
                        {followersFileName || 'Kliknij, aby wybrać followers_1.json'}
                      </span>
                    </div>

                    {/* Following File */}
                    <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-amber-400 transition-all text-center">
                      <UploadCloud size={24} className="mx-auto text-amber-600 mb-2" />
                      <label className="block text-xs font-bold text-gray-800 mb-1 cursor-pointer">
                        2. Wskaż plik following.json (Obserwowani)
                        <input
                          type="file"
                          accept=".json,.html"
                          onChange={handleFollowingFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-gray-500 block truncate">
                        {followingFileName || 'Kliknij, aby wybrać following.json'}
                      </span>
                    </div>
                  </div>

                  {importSuccessNotice && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{importSuccessNotice}</span>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: LIVE API SCAN */}
              {unfollowMode === 'live' && (
                <div className="space-y-4 pt-2">
                  <form onSubmit={handleAnalyzeUnfollowers} className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        @
                      </span>
                      <input
                        type="text"
                        value={myUsername}
                        onChange={(e) => setMyUsername(e.target.value)}
                        placeholder="Wpisz swój Instagram handle (np. yrkblz)"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={unfollowLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {unfollowLoading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Analizowanie konta...
                        </>
                      ) : (
                        <>
                          <Search size={16} />
                          Sprawdź odobserwowania
                        </>
                      )}
                    </button>
                  </form>

                  {/* Partial scan notice */}
                  {partialScanNotice && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle size={18} className="text-amber-600" />
                        Ochrona przed fałszywymi wynikami (Częściowy skan Instagrama)
                      </div>
                      <p>{partialScanNotice}</p>
                      <button
                        type="button"
                        onClick={() => setUnfollowMode('export')}
                        className="font-bold text-amber-900 underline hover:text-amber-950 block"
                      >
                        → Przełącz na „Import z Instagrama (JSON)”, aby sprawdzić 100% listy bez ograniczeń
                      </button>
                    </div>
                  )}

                  {/* Checkpoint / Suspension Explanation Banner */}
                  {isCheckpointError && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle size={18} className="text-amber-600" />
                        Wymagana weryfikacja sesji Instagrama (Checkpoint)
                      </div>
                      <p>
                        Instagram wykrył, że podana sesja wymaga potwierdzenia tożsamości na Twoim telefonie lub wygasła.
                      </p>
                      <p className="font-semibold">Jak to naprawić:</p>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Otwórz aplikację Instagram na telefonie i zatwierdź powiadomienie.</li>
                        <li>Zaloguj się na instagram.com na komputerze.</li>
                        <li>Kliknij przycisk <strong>„Konto do akcji”</strong> na górze strony i wklej świeży <strong>sessionid</strong>.</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {unfollowError && !isCheckpointError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {unfollowError}
                </div>
              )}
            </div>

            {/* Stats Summary */}
            {accountStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-200">
                  <span className="text-xs text-gray-500 block">Nie obserwują Cię zwrotnie</span>
                  <span className="text-2xl font-bold text-rose-600">{notFollowingBack.length}</span>
                  <span className="text-[11px] text-gray-400 block mt-1">Ty ich obserwujesz, oni Ciebie nie</span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200">
                  <span className="text-xs text-gray-500 block">Odobserwowali Cię niedawno</span>
                  <span className="text-2xl font-bold text-amber-600">{unfollowedYou.length}</span>
                  <span className="text-[11px] text-gray-400 block mt-1">Od ostatniego sprawdzenia profilu</span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200">
                  <span className="text-xs text-gray-500 block">Twoi fani (Fans)</span>
                  <span className="text-2xl font-bold text-emerald-600">{fans.length}</span>
                  <span className="text-[11px] text-gray-400 block mt-1">Obserwują Cię, a Ty ich nie</span>
                </div>
              </div>
            )}

            {/* List: Not Following Back */}
            {notFollowingBack.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-[#d2d2d7] shadow-xs">
                <h3 className="font-bold text-gray-900 mb-1">
                  Konta, które nie obserwują Cię zwrotnie ({notFollowingBack.length})
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Możesz bezpiecznie odobserwować te profile jednym kliknięciem:
                </p>

                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {notFollowingBack.map((user) => {
                    const isUnfollowing = unfollowingIds.has(user.id);
                    const isSuccess = unfollowedSuccessIds.has(user.id);

                    return (
                      <div key={user.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
                            {user.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <a
                              href={`https://www.instagram.com/${user.username}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1"
                            >
                              @{user.username}
                              <ExternalLink size={12} className="text-gray-400" />
                            </a>
                            <span className="text-xs text-gray-500">{user.fullName || 'Brak imienia'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnfollow(user)}
                            disabled={isUnfollowing || isSuccess}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {isSuccess ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                Odobserwowano
                              </span>
                            ) : isUnfollowing ? (
                              'Odobserwowywanie...'
                            ) : (
                              'Odobserwuj (Unfollow)'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
