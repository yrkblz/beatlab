'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Trash2, Calendar, Download, ChevronDown, Check } from 'lucide-react';
import { User } from '@supabase/supabase-js';

const GENRES = ['Trap', 'Boom Bap', 'R&B', 'Drill', 'Afrobeat', 'Pop', 'Lo-Fi', 'Synthwave', 'Other'];
const KEYS = ['C Major', 'C Minor', 'C# Major', 'C# Minor', 'D Major', 'D Minor', 'D# Major', 'D# Minor', 'E Major', 'E Minor', 'F Major', 'F Minor', 'F# Major', 'F# Minor', 'G Major', 'G Minor', 'G# Major', 'G# Minor', 'A Major', 'A Minor', 'A# Major', 'A# Minor', 'B Major', 'B Minor'];

// Custom Select Component
function CustomSelect({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (v: string) => void, placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm flex justify-between items-center cursor-pointer hover:border-gray-300 transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          {options.map(opt => (
            <div 
              key={opt} 
              onClick={() => { onChange(opt); setOpen(false); }}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer flex justify-between items-center transition-colors"
            >
              {opt}
              {value === opt && <Check size={14} className="text-black" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BityPage() {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('All');
  
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Trap');
  const [bpm, setBpm] = useState('');
  const [keyVal, setKeyVal] = useState('C Minor');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecking(false);
      if (user) {
        fetchBeats(user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function fetchBeats(userId: string) {
    setLoading(true);
    const { data } = await supabase.from('beats').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setBeats(data);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title || !bpm || !user) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('beats_files').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('beats_files').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('beats').insert([
        { 
          title, 
          genre, 
          bpm: parseInt(bpm), 
          key_signature: keyVal,
          file_url: publicUrlData.publicUrl,
          user_id: user.id
        }
      ]);

      if (dbError) throw dbError;

      setTitle('');
      setBpm('');
      setFile(null);
      fetchBeats(user.id);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this beat?')) return;
    await supabase.from('beats').delete().match({ id });
    if (user) fetchBeats(user.id);
  }

  if (authChecking) {
    return <div className="p-8 text-center text-gray-500">Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to view and manage your beats.</p>
        <a href="/account" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium">Go to Login</a>
      </div>
    );
  }

  const filteredBeats = filter === 'All' ? beats : beats.filter(b => b.genre === filter);
  const allFilters = ['All', ...GENRES];

  return (
    <div className="max-w-7xl mx-auto pb-12 flex gap-8">
      {/* Left Panel */}
      <div className="w-80 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-8">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <span className="text-xl mr-2 font-normal">+</span> Add new beat
          </h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
              <input 
                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="e.g. Dark Knight"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Genre (Folder)</label>
              <CustomSelect options={GENRES} value={genre} onChange={setGenre} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">BPM</label>
                <input 
                  type="number" required value={bpm} onChange={e => setBpm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="140"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Key</label>
                <CustomSelect options={KEYS} value={keyVal} onChange={setKeyVal} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 mt-2">Upload File (MP3 only)</label>
              <label 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile && droppedFile.type.includes('mpeg')) {
                    setFile(droppedFile);
                  } else if (droppedFile) {
                    alert('Please upload an MP3 file only.');
                  }
                }}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
              >
                <Upload size={20} className={`${isDragging ? 'text-blue-500' : 'text-gray-400'} mb-2 transition-colors`} />
                <span className="text-xs text-gray-500 text-center">
                  {file ? file.name : 'Click or Drag & Drop MP3 file here'}
                </span>
                <input type="file" className="hidden" accept=".mp3,audio/mpeg" required onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <button 
              type="submit" disabled={uploading}
              className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors mt-4"
            >
              {uploading ? 'Saving...' : 'Save to Database'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1">
        <div className="flex flex-wrap gap-2 mb-6">
          {allFilters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Genre</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">BPM / Key</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Added</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attachment</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredBeats.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No beats found.</td></tr>
              ) : (
                filteredBeats.map(beat => (
                  <tr key={beat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{beat.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{beat.genre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{beat.bpm} • {beat.key_signature || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                      <Calendar size={14} className="mr-1.5" /> {new Date(beat.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href={beat.file_url} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 font-medium hover:underline">
                        <Download size={14} className="mr-1" /> Download
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => handleDelete(beat.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
