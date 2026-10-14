'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  PlaySquare,
  AtSign,
  Loader2,
  Copy,
  ExternalLink,
  Download,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  History,
  Check,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export interface LeadItem {
  channelName: string;
  instagram: string;
  videoTitle: string;
  videoUrl: string;
  isPastDuplicate?: boolean;
}

export interface SavedLead {
  instagram: string;
  channelName: string;
  savedAt: string;
}

export const LEADS_STORAGE_KEY = 'beatlab_discovered_leads_history';

export default function LeadsPage() {
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState<number>(50);
  const [onlyUnique, setOnlyUnique] = useState<boolean>(false);

  const [rawResults, setRawResults] = useState<LeadItem[]>([]);
  const [history, setHistory] = useState<SavedLead[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LEADS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading leads history:', err);
    }
  }, []);

  // Filter leads dynamically based on onlyUnique toggle
  const { leads, duplicatesCount } = useMemo(() => {
    if (rawResults.length === 0) {
      return { leads: [], duplicatesCount: 0 };
    }

    if (!onlyUnique) {
      return { leads: rawResults, duplicatesCount: 0 };
    }

    const uniqueList = rawResults.filter((l) => !l.isPastDuplicate);
    const dups = rawResults.filter((l) => l.isPastDuplicate).length;

    return { leads: uniqueList, duplicatesCount: dups };
  }, [rawResults, onlyUnique]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setRawResults([]);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), maxResults }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'An error occurred during the search');
      }

      const incomingLeads: LeadItem[] = data.leads || [];

      if (incomingLeads.length === 0) {
        setError(
          `No Instagram handles found in the descriptions of the latest ${maxResults} videos for this tag.`
        );
        setLoading(false);
        return;
      }

      // Check against existing history prior to this search
      const existingIg = new Set(history.map((h) => (h.instagram || '').toLowerCase().trim()));
      const existingChannels = new Set(history.map((h) => (h.channelName || '').toLowerCase().trim()));

      const taggedLeads: LeadItem[] = incomingLeads.map((item) => ({
        ...item,
        isPastDuplicate:
          existingIg.has(item.instagram.toLowerCase().trim()) ||
          existingChannels.has(item.channelName.toLowerCase().trim()),
      }));

      setRawResults(taggedLeads);

      // Save newly discovered unique leads to history for subsequent searches
      const trulyNew = taggedLeads.filter((l) => !l.isPastDuplicate);
      if (trulyNew.length > 0) {
        const newRecords: SavedLead[] = trulyNew.map((item) => ({
          instagram: item.instagram,
          channelName: item.channelName,
          savedAt: new Date().toISOString(),
        }));
        const updatedHistory = [...history, ...newRecords];
        setHistory(updatedHistory);
        try {
          localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (err) {
          console.error('Error saving leads history:', err);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyInstagrams() {
    const list = leads.map((l) => l.instagram).join('\n');
    navigator.clipboard.writeText(list);
    setCopiedType('ig');
    setTimeout(() => setCopiedType(null), 2500);
    alert('Instagram handles copied to clipboard!');
  }

  function copyAllAsCsv() {
    const header = 'YouTube Channel,Instagram,Video Title,Video URL\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.channelName.replace(/"/g, '""')}","@${l.instagram}","${l.videoTitle.replace(
            /"/g,
            '""'
          )}","${l.videoUrl}"`
      )
      .join('\n');
    navigator.clipboard.writeText(header + rows);
    setCopiedType('csv');
    setTimeout(() => setCopiedType(null), 2500);
  }

  function handleClearHistory() {
    if (confirm('Clear all saved leads from history? Next search will treat all found artists as new.')) {
      setHistory([]);
      try {
        localStorage.removeItem(LEADS_STORAGE_KEY);
      } catch {}
      // Clear past duplicate flags on currently loaded results
      setRawResults((prev) => prev.map((l) => ({ ...l, isPastDuplicate: false })));
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          Lead Finder (YouTube)
        </h2>
        <p className="text-gray-500 mt-2">
          Enter a tag (e.g. &quot;drake type beat&quot;) to scrape Instagram handles from latest video descriptions.
        </p>
      </div>

      {/* Main Search & Options Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. playboi carti type beat"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-gray-900"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-8 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center min-w-[160px] justify-center disabled:opacity-70 shadow-md cursor-pointer text-sm shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  <span>Scanning...</span>
                </>
              ) : (
                'Search Leads'
              )}
            </button>
          </div>

          {/* Search Controls Toolbar: Scan count & Unique toggle */}
          <div className="pt-3 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
            {/* Quantity Selector */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 shrink-0">
                <SlidersHorizontal size={14} className="text-gray-400" />
                Videos to scan:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200/80">
                {[10, 25, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxResults(num)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      maxResults === num
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {num} videos
                  </button>
                ))}
              </div>
            </div>

            {/* Deduplication & Unique Leads Toggle */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyUnique}
                  onChange={(e) => setOnlyUnique(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer accent-black"
                />
                <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500 shrink-0" />
                  Only unique leads (exclude previously found)
                </span>
              </label>

              {/* History Counter & Clear Action */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium"
                  title="Total unique leads saved in your local database"
                >
                  <History size={12} className="text-gray-400" />
                  <span>{history.length} in history</span>
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-gray-400 hover:text-red-600 transition-colors text-xs font-medium underline flex items-center gap-0.5 cursor-pointer"
                    title="Clear saved leads history"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-5 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center">
            <span className="font-semibold mr-2 shrink-0">Error:</span> {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {leads.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          {/* Table Header Bar */}
          <div className="p-5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                <Search size={18} className="mr-2 text-gray-400" />
                Found Leads:{' '}
                <span className="ml-2 bg-black text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {leads.length}
                </span>
              </h3>

              {duplicatesCount > 0 && onlyUnique && (
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                  {duplicatesCount} duplicate{duplicatesCount > 1 ? 's' : ''} skipped
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={copyInstagrams}
                className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
              >
                {copiedType === 'ig' ? (
                  <>
                    <Check size={15} className="mr-1.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} className="mr-1.5 text-gray-500" />
                    <span>Copy IG Only</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={copyAllAsCsv}
                className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
                title="Copy all details (Channel, IG, Video) formatted as CSV"
              >
                {copiedType === 'csv' ? (
                  <>
                    <Check size={15} className="mr-1.5 text-emerald-600" />
                    <span>CSV Copied!</span>
                  </>
                ) : (
                  <>
                    <Download size={15} className="mr-1.5 text-gray-500" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    YouTube Channel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Instagram (from desc)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Source Video
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {leads.map((lead, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <PlaySquare size={18} className="text-red-500 mr-3 shrink-0" />
                        <span className="font-semibold text-gray-900">{lead.channelName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <a
                        href={`https://instagram.com/${lead.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <AtSign size={16} className="mr-1.5 opacity-70 shrink-0" /> {lead.instagram}
                      </a>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <a
                        href={lead.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-gray-900 flex items-center max-w-[280px] truncate transition-colors"
                        title={lead.videoTitle}
                      >
                        <span className="truncate">{lead.videoTitle}</span>
                        <ExternalLink
                          size={14}
                          className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
