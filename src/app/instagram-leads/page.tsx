'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Users,
  MessageSquare,
  Hash,
  Download,
  Copy,
  Check,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Key,
  Trash2,
  History,
  AlertCircle,
  FolderPlus,
  Send,
  AtSign,
  Mail,
  Music,
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InstagramLeadItem } from '@/app/api/instagram-leads/route';
import { exportLeadsToExcel, exportLeadsToCsv } from '@/lib/instagram-export';

export const IG_HISTORY_STORAGE_KEY = 'beatlab_instagram_leads_history';
export const RAPIDAPI_KEY_STORAGE_KEY = 'beatlab_rapidapi_key';

export default function InstagramLeadsPage() {
  // Input & Collection parameters
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<'followers' | 'following' | 'comments' | 'hashtag'>('followers');
  const [limit, setLimit] = useState<number>(50);

  // Filters
  const [roleFilters, setRoleFilters] = useState<string[]>(['artist', 'producer']);
  const [minFollowers, setMinFollowers] = useState<number>(500);
  const [maxFollowers, setMaxFollowers] = useState<number>(200000);
  const [onlyWithContact, setOnlyWithContact] = useState<boolean>(false);
  const [keepUncategorized, setKeepUncategorized] = useState<boolean>(false);
  const [onlyUnique, setOnlyUnique] = useState<boolean>(true);

  // API Key Settings Modal
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Results & UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawLeads, setRawLeads] = useState<InstagramLeadItem[]>([]);
  const [history, setHistory] = useState<string[]>([]); // list of handles
  const [priorHistory, setPriorHistory] = useState<string[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [addedCrmHandles, setAddedCrmHandles] = useState<Set<string>>(new Set());
  const [crmLoadingHandle, setCrmLoadingHandle] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load history, user & stored API key on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(IG_HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
          setPriorHistory(parsed);
        }
      }

      const storedKey = localStorage.getItem(RAPIDAPI_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
        setTempApiKey(storedKey);
      }
    } catch (e) {
      console.error('Error loading localStorage:', e);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  // Filter raw leads based on deduplication
  const { leads, duplicateCount } = useMemo(() => {
    if (rawLeads.length === 0) return { leads: [], duplicateCount: 0 };
    if (!onlyUnique) return { leads: rawLeads, duplicateCount: 0 };

    const historySet = new Set(priorHistory.map(h => h.toLowerCase()));
    const filtered = rawLeads.filter(l => !historySet.has(l.handle.toLowerCase()));
    const duplicates = rawLeads.length - filtered.length;

    return { leads: filtered, duplicateCount: duplicates };
  }, [rawLeads, onlyUnique, priorHistory]);

  // Handle Search Submission
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim()) return;

    setLoading(true);
    setError('');
    // Snapshot existing history so new leads aren't deduplicated against themselves
    const currentPrior = [...history];
    setPriorHistory(currentPrior);

    try {
      const res = await fetch('/api/instagram-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: source.trim(),
          mode,
          limit,
          minFollowers,
          maxFollowers,
          roleFilters,
          onlyWithContact,
          keepUncategorized,
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'MISSING_API_KEY') {
          setIsApiKeyModalOpen(true);
        }
        throw new Error(data.error || 'Failed to scan Instagram profiles.');
      }

      const incomingLeads: InstagramLeadItem[] = data.leads || [];
      setRawLeads(incomingLeads);

      if (incomingLeads.length === 0) {
        setError(`No matching profiles found for "${source}". Try adjusting the follower range (500 - 200k) or selecting different role filters.`);
      } else {
        // Save newly discovered handles into history
        const newHandles = incomingLeads.map(l => l.handle);
        const combinedHistory = Array.from(new Set([...history, ...newHandles]));
        setHistory(combinedHistory);
        localStorage.setItem(IG_HISTORY_STORAGE_KEY, JSON.stringify(combinedHistory));
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the scraper API.');
    } finally {
      setLoading(false);
    }
  }

  // Save API key
  function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tempApiKey.trim();
    setApiKey(trimmed);
    localStorage.setItem(RAPIDAPI_KEY_STORAGE_KEY, trimmed);
    setIsApiKeyModalOpen(false);
  }

  // Add Lead to Placement CRM
  async function handleAddToCrm(lead: InstagramLeadItem) {
    if (!currentUser) {
      alert('Please log in to add leads to your Placement CRM.');
      return;
    }

    setCrmLoadingHandle(lead.handle);
    try {
      const notesContent = [
        `Category: ${lead.category}`,
        `Followers: ${lead.followers.toLocaleString()}`,
        `Bio: ${lead.bio}`,
        lead.email ? `Email: ${lead.email}` : '',
        lead.publicLinks.length > 0 ? `Links: ${lead.publicLinks.join(', ')}` : '',
        `Instagram: ${lead.profileUrl}`,
      ].filter(Boolean).join('\n');

      const { error: insertError } = await supabase.from('placements').insert([
        {
          user_id: currentUser.id,
          artist_name: lead.fullName ? `${lead.fullName} (${lead.handle})` : lead.handle,
          beat_title: 'Unassigned Pack',
          status: 'To Send',
          notes: notesContent,
        },
      ]);

      if (insertError) throw insertError;

      setAddedCrmHandles(prev => new Set([...prev, lead.handle]));
    } catch (err: any) {
      alert(`Error saving to CRM: ${err.message}`);
    } finally {
      setCrmLoadingHandle(null);
    }
  }

  // Copy helpers
  function copyHandles() {
    if (leads.length === 0) return;
    const text = leads.map(l => l.handle).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedType('handles');
    setTimeout(() => setCopiedType(null), 2500);
  }

  function copyEmails() {
    const emailsList = leads.map(l => l.email).filter(Boolean);
    if (emailsList.length === 0) {
      alert('No email addresses found among the filtered leads.');
      return;
    }
    navigator.clipboard.writeText(emailsList.join('\n'));
    setCopiedType('emails');
    setTimeout(() => setCopiedType(null), 2500);
  }

  function copyDmLinks() {
    if (leads.length === 0) return;
    const links = leads.map(l => `https://ig.me/m/${l.handle.replace('@', '')}`).join('\n');
    navigator.clipboard.writeText(links);
    setCopiedType('dms');
    setTimeout(() => setCopiedType(null), 2500);
  }

  function handleClearHistory() {
    if (!confirm('Are you sure you want to clear your local Instagram leads history?')) return;
    setHistory([]);
    setPriorHistory([]);
    localStorage.removeItem(IG_HISTORY_STORAGE_KEY);
  }

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            <span className="p-2 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white rounded-xl mr-3 shadow-xs">
              <AtSign size={20} />
            </span>
            Instagram Lead Finder
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Scrape, categorize, and pitch active rappers, singers, and producers from Instagram.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setIsApiKeyModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
          >
            <Key size={14} className={apiKey ? 'text-emerald-600' : 'text-amber-500'} />
            <span>{apiKey ? 'RapidAPI Configured' : 'Configure RapidAPI'}</span>
          </button>
        </div>
      </div>

      {/* Main Scraper Control Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Source Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Source Profile, Post URL or Hashtag *
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <AtSign size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  placeholder="e.g. https://www.instagram.com/roseeyeview/ or @ontheradar"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Scraping Profiles...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Scrape Leads</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collection Mode Selector (What to collect) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Collection Target (What to Scrape)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('followers')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'followers'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Users size={15} />
                <span>Followers</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('following')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'following'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Radio size={15} />
                <span>Following</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('comments')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'comments'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <MessageSquare size={15} />
                <span>Comments on Post</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('hashtag')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'hashtag'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Hash size={15} />
                <span>Hashtag Search</span>
              </button>
            </div>
          </div>

          {/* Quantity Selector & Criteria Filters */}
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Profile Count */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 shrink-0">
                  <SlidersHorizontal size={14} className="text-gray-400" />
                  Profiles to collect:
                </span>
                <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200/80">
                  {[25, 50, 100, 200].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLimit(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        limit === num
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roles pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 mr-1">Target Roles:</span>
                {[
                  { id: 'artist', label: 'Rappers & Artists' },
                  { id: 'producer', label: 'Producers' },
                  { id: 'engineer', label: 'Sound Engineers' },
                ].map(r => {
                  const active = roleFilters.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setRoleFilters(roleFilters.filter(f => f !== r.id));
                        } else {
                          setRoleFilters([...roleFilters, r.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Filters: Follower Range & Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Follower Range (Target Artists)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minFollowers}
                    onChange={e => setMinFollowers(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
                    placeholder="Min (500)"
                  />
                  <span className="text-xs text-gray-400">-</span>
                  <input
                    type="number"
                    value={maxFollowers}
                    onChange={e => setMaxFollowers(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
                    placeholder="Max (200000)"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWithContact}
                    onChange={e => setOnlyWithContact(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Only with email or music links (Spotify/Soundcloud)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepUncategorized}
                    onChange={e => setKeepUncategorized(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Include uncategorized profiles
                  </span>
                </label>
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyUnique}
                    onChange={e => setOnlyUnique(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-500" />
                    Exclude previously collected leads
                  </span>
                </label>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium">
                    <History size={11} className="text-gray-400" />
                    <span>{history.length} in local history</span>
                  </span>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-gray-400 hover:text-red-600 transition-colors text-[11px] font-medium underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Scraper Notice</p>
              <p>{error}</p>
              {!apiKey && (
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="mt-2 text-xs font-bold text-red-800 underline hover:no-underline"
                >
                  Configure your RapidAPI key now &rarr;
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {leads.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden space-y-0">
          {/* Action Toolbar */}
          <div className="p-5 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center">
                <span>Discovered Artists:</span>
                <span className="ml-2 bg-black text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {leads.length}
                </span>
              </h3>

              {duplicateCount > 0 && onlyUnique && (
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                  {duplicateCount} duplicates skipped
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportLeadsToExcel(leads)}
                className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
                title="Download formatted Excel spreadsheet matching your Telegram template"
              >
                <Download size={14} className="mr-1.5" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => exportLeadsToCsv(leads)}
                className="flex items-center text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <Download size={14} className="mr-1.5 text-gray-500" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={copyHandles}
                className="flex items-center text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                {copiedType === 'handles' ? (
                  <>
                    <Check size={14} className="mr-1.5 text-emerald-600" />
                    <span>Handles Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5 text-gray-500" />
                    <span>Copy @Handles</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={copyEmails}
                className="flex items-center text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                {copiedType === 'emails' ? (
                  <>
                    <Check size={14} className="mr-1.5 text-emerald-600" />
                    <span>Emails Copied!</span>
                  </>
                ) : (
                  <>
                    <Mail size={14} className="mr-1.5 text-gray-500" />
                    <span>Copy Emails</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 block md:table">
              <thead className="bg-white hidden md:table-header-group">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Artist / Handle
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Role &amp; Keywords
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Followers
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Bio &amp; Links
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pitch &amp; CRM Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white block md:table-row-group">
                {leads.map((lead, idx) => {
                  const isAddedToCrm = addedCrmHandles.has(lead.handle);
                  const isAdding = crmLoadingHandle === lead.handle;

                  return (
                    <tr
                      key={idx}
                      className="p-4 md:p-0 block md:table-row hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Artist / Handle */}
                      <td className="block md:table-cell md:px-5 md:py-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs">
                            {lead.fullName ? lead.fullName.charAt(0).toUpperCase() : lead.handle.charAt(1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <a
                              href={lead.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm md:text-base"
                            >
                              <span>{lead.handle}</span>
                              <ExternalLink size={12} className="opacity-40" />
                            </a>
                            <p className="text-xs text-gray-500 truncate">{lead.fullName || 'No name specified'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category & Keywords */}
                      <td className="block md:table-cell md:px-5 md:py-4 py-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              lead.category === 'Артист'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : lead.category === 'Продюсер'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : lead.category === 'Звукорежиссёр'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {lead.category}
                          </span>

                          {lead.matchedKeywords.slice(0, 3).map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Followers */}
                      <td className="block md:table-cell md:px-5 md:py-4 py-1.5 text-sm text-gray-700">
                        <span className="inline-block md:hidden text-xs text-gray-400 font-semibold uppercase mr-1">Followers:</span>
                        <span className="font-semibold text-gray-900">
                          {lead.followers ? lead.followers.toLocaleString() : 'N/A'}
                        </span>
                      </td>

                      {/* Bio & Links */}
                      <td className="block md:table-cell md:px-5 md:py-4 py-2 text-xs text-gray-600 max-w-sm">
                        <p className="line-clamp-2 text-gray-700 leading-relaxed mb-1.5">{lead.bio || '—'}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                            >
                              <Mail size={11} />
                              <span>{lead.email}</span>
                            </a>
                          )}
                          {lead.publicLinks.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline bg-blue-50/50 px-2 py-0.5 rounded-md"
                              title={link}
                            >
                              <Music size={11} />
                              <span className="truncate max-w-[150px]">
                                {link.replace(/^https?:\/\/(www\.)?/, '')}
                              </span>
                            </a>
                          ))}
                        </div>
                      </td>

                      {/* Actions: Send DM & Add to CRM */}
                      <td className="block md:table-cell md:px-5 md:py-4 py-2 text-left md:text-right pt-3 border-t md:border-t-0 border-gray-100">
                        <div className="flex items-center justify-start md:justify-end gap-2">
                          {/* Send DM button */}
                          <a
                            href={`https://ig.me/m/${lead.handle.replace('@', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <Send size={12} />
                            <span>Send DM</span>
                          </a>

                          {/* 1-Click Add to Placement CRM */}
                          <button
                            type="button"
                            disabled={isAddedToCrm || isAdding}
                            onClick={() => handleAddToCrm(lead)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isAddedToCrm
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                            }`}
                          >
                            {isAddedToCrm ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>In CRM</span>
                              </>
                            ) : isAdding ? (
                              <span>Adding...</span>
                            ) : (
                              <>
                                <FolderPlus size={13} className="text-blue-600" />
                                <span>Add to CRM</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RapidAPI Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Key size={18} className="text-blue-600" />
                <span>RapidAPI Configuration</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Enter your <strong>RapidAPI Key</strong> to enable Instagram scraping on localhost.
              You can subscribe to Instagram Scraper API on RapidAPI (free plans available) and paste your key below.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  X-RapidAPI-Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={e => setTempApiKey(e.target.value)}
                  placeholder="Paste your RapidAPI key here..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-black focus:bg-white font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
