'use client';

import { useState } from 'react';
import { Download, Video, Loader2, Link2, AlertCircle } from 'lucide-react';

export default function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ title: string, link: string } | null>(null);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/download-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to download');
      }

      setResult({ title: data.title, link: data.link });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
          <Video size={32} className="text-red-600 mr-3" />
          YouTube MP3 Downloader
        </h2>
        <p className="text-gray-500 mt-2">Convert and download YouTube videos to MP3 directly to your computer.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <form onSubmit={handleDownload} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Link2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube link here..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-gray-900"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center min-w-[200px] disabled:opacity-70 shadow-md"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Download size={18} className="mr-2" /> Convert to MP3</>}
          </button>
        </form>
        
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle size={18} className="mr-2 text-green-500" />
              Conversion Successful
            </h3>
          </div>
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Video size={32} className="text-red-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-6 max-w-xl truncate">{result.title}</h4>
            <a 
              href={result.link}
              target="_blank"
              rel="noreferrer"
              className="bg-black text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
            >
              <Download size={20} className="mr-2" />
              Download MP3 Now
            </a>
            <p className="text-xs text-gray-400 mt-4">Link expires in a few hours.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Need to import CheckCircle here since I used it above
import { CheckCircle } from 'lucide-react';
