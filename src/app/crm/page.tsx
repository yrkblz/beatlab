'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Plus, Trash2, Pencil } from 'lucide-react';

const COLUMNS = ['To Send', 'Sent', 'Listened', 'Placement'];

export default function CRMPage() {
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // New Placement Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newBeatTitle, setNewBeatTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPlacement, setEditingPlacement] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecking(false);
      if (user) {
        fetchPlacements(user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function fetchPlacements(userId: string) {
    setLoading(true);
    const { data } = await supabase.from('placements').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setPlacements(data);
    setLoading(false);
  }

  async function handleAddPlacement(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newArtistName || !newBeatTitle) return;

    const { data, error } = await supabase.from('placements').insert([
      {
        user_id: user.id,
        artist_name: newArtistName,
        beat_title: newBeatTitle,
        notes: newNotes,
        status: 'To Send'
      }
    ]).select();

    if (error) {
      alert(`Error: ${error.message}`);
    } else if (data) {
      setPlacements([...placements, data[0]]);
      setNewArtistName('');
      setNewBeatTitle('');
      setNewNotes('');
      setShowAddForm(false);
    }
  }

  function handleDelete(id: string) {
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    await supabase.from('placements').delete().eq('id', deleteConfirmId);
    setPlacements(prev => prev.filter(p => p.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlacement) return;

    const { data, error } = await supabase
      .from('placements')
      .update({
        artist_name: editingPlacement.artist_name,
        beat_title: editingPlacement.beat_title,
        notes: editingPlacement.notes,
      })
      .eq('id', editingPlacement.id)
      .select();

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      if (data && data.length > 0) {
        setPlacements(prev => prev.map(p => p.id === editingPlacement.id ? data[0] : p));
      } else {
        setPlacements(prev => prev.map(p => p.id === editingPlacement.id ? editingPlacement : p));
      }
      setEditingPlacement(null);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    // Optimistic update
    setPlacements(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    await supabase.from('placements').update({ status: newStatus }).eq('id', id);
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('placementId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('placementId');
    if (id) {
      updateStatus(id, status);
    }
  };

  if (authChecking) {
    return <div className="p-8 text-center text-gray-500">Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to manage your placements.</p>
        <a href="/account" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium">Go to Login</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement CRM</h1>
          <p className="text-gray-500">Track your beats sent to artists and A&Rs.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} />
          <span>Add Lead</span>
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">New Lead</h3>
          <form onSubmit={handleAddPlacement} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Artist Name *</label>
              <input 
                type="text" required value={newArtistName} onChange={e => setNewArtistName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                placeholder="e.g. Drake"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Beat Title *</label>
              <input 
                type="text" required value={newBeatTitle} onChange={e => setNewBeatTitle(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                placeholder="e.g. 6ix God"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
              <input 
                type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                placeholder="Manager's email..."
              />
            </div>
            <div className="flex items-end space-x-2">
              <button type="submit" className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">
                Save
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading placements...</div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div 
              key={col} 
              className="flex-1 min-w-[280px] bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
            >
              <h3 className="font-bold text-gray-700 mb-4 flex justify-between items-center">
                {col}
                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {placements.filter(p => p.status === col).length}
                </span>
              </h3>
              
              <div className="flex-1 flex flex-col gap-3 min-h-[200px]">
                {placements.filter(p => p.status === col).map(placement => (
                  <div 
                    key={placement.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, placement.id)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{placement.artist_name}</h4>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setEditingPlacement(placement)}
                          className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(placement.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-600 mb-2">🎵 {placement.beat_title}</div>
                    {placement.notes && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded break-words">
                        {placement.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Usuń kontakt</h3>
              <p className="text-gray-500 text-sm mb-6">
                Czy na pewno chcesz usunąć ten kontakt z tablicy? Tej operacji nie można cofnąć.
              </p>
              <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setDeleteConfirmId(null)} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Anuluj
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  Tak, usuń
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* EDIT MODAL */}
      {editingPlacement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Pencil size={24} className="text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Lead</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Artist Name *</label>
                  <input 
                    type="text" required value={editingPlacement.artist_name} onChange={e => setEditingPlacement({...editingPlacement, artist_name: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Beat Title *</label>
                  <input 
                    type="text" required value={editingPlacement.beat_title} onChange={e => setEditingPlacement({...editingPlacement, beat_title: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <input 
                    type="text" value={editingPlacement.notes || ''} onChange={e => setEditingPlacement({...editingPlacement, notes: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div className="flex space-x-3 w-full pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors"
                  >
                    Save
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingPlacement(null)} 
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
