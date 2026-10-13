'use client';

import { useState } from 'react';
import { Search, PlaySquare, AtSign, Loader2, Copy, ExternalLink, Download } from 'lucide-react';

export default function LeadsPage() {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setLeads([]);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 50 })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'An error occurred during the search');
      }

      setLeads(data.leads);
      if (data.leads.length === 0) {
        setError('No Instagram handles found in the descriptions of the latest 50 videos for this tag.');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function copyInstagrams() {
    const list = leads.map(l => l.instagram).join('\n');
    navigator.clipboard.writeText(list);
    alert('Instagram handles copied to clipboard!');
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Lead Finder (YouTube)</h2>
        <p className="text-gray-500 mt-2">Enter a tag (e.g. "drake type beat") to scrape Instagram handles from latest video descriptions.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
            className="bg-black text-white px-8 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center min-w-[160px] justify-center disabled:opacity-70 shadow-md"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Search Leads'}
          </button>
        </form>
        
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center">
            <span className="font-semibold mr-2">Error:</span> {error}
          </div>
        )}
      </div>

      {leads.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Search size={18} className="mr-2 text-gray-400" />
              Found Leads: <span className="ml-2 bg-black text-white px-2.5 py-0.5 rounded-full text-xs">{leads.length}</span>
            </h3>
            <button 
              onClick={copyInstagrams}
              className="flex items-center text-sm font-medium text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Copy size={16} className="mr-2" /> Copy IG Only
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">YouTube Channel</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Instagram (from desc)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {leads.map((lead, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <PlaySquare size={18} className="text-red-500 mr-3" />
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
                      <AtSign size={16} className="mr-1.5 opacity-70" /> {lead.instagram}
                    </a>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm">
                    <a 
                      href={lead.videoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-gray-500 hover:text-gray-900 flex items-center max-w-[250px] truncate transition-colors"
                      title={lead.videoTitle}
                    >
                      {lead.videoTitle} <ExternalLink size={14} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
