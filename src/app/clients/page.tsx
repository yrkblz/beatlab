'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import {
  Users,
  Search,
  Plus,
  ExternalLink,
  Mail,
  ShoppingBag,
  Pencil,
  Trash2,
  X,
  History,
  TrendingUp,
  Award,
  Sparkles,
  ArrowUpDown,
  Music,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ClientItem,
  ClientPurchaseRecord,
  fetchClientsWithSales,
  saveClientRecord,
  deleteClientRecord,
  getClientPurchaseHistory,
  formatClientFullName,
} from '@/lib/clients-storage';

function ClientsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search');

  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientItem[]>([]);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [sortBy, setSortBy] = useState<'purchases' | 'newest' | 'name'>('purchases');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Purchase History Modal
  const [historyClient, setHistoryClient] = useState<ClientItem | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ClientPurchaseRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete Confirmation Modal
  const [clientToDelete, setClientToDelete] = useState<ClientItem | null>(null);

  // Success Banner
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecking(false);
      if (user) {
        loadClients(user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function loadClients(userId: string) {
    setLoading(true);
    try {
      const data = await fetchClientsWithSales(userId);
      setClients(data);
    } catch (e) {
      console.error('Failed loading clients:', e);
    } finally {
      setLoading(false);
    }
  }

  function showNotice(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  function openAddModal() {
    setEditingClient(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setInstagram('');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(c: ClientItem) {
    setEditingClient(c);
    setFirstName(c.first_name);
    setLastName(c.last_name || '');
    setEmail(c.email || '');
    setInstagram(c.instagram || '');
    setNotes(c.notes || '');
    setFormError('');
    setIsModalOpen(true);
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!firstName.trim()) {
      setFormError('Imię klienta (First Name) jest wymagane.');
      return;
    }

    setFormSaving(true);
    setFormError('');

    try {
      await saveClientRecord(
        {
          id: editingClient?.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          instagram: instagram.trim(),
          notes: notes.trim(),
        },
        user.id
      );

      await loadClients(user.id);
      setIsModalOpen(false);
      showNotice(
        editingClient
          ? `Zaktualizowano dane klienta ${firstName.trim()}!`
          : `Pomyślnie dodano klienta ${firstName.trim()}!`
      );
    } catch (err: any) {
      setFormError(err.message || 'Wystąpił błąd podczas zapisywania klienta.');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!clientToDelete || !user) return;
    try {
      await deleteClientRecord(clientToDelete.id, user.id);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      showNotice(`Usunięto klienta ${clientToDelete.full_name || clientToDelete.first_name}.`);
      setClientToDelete(null);
    } catch (err: any) {
      alert(`Błąd usuwania: ${err.message}`);
    }
  }

  async function handleViewHistory(client: ClientItem) {
    if (!user) return;
    setHistoryClient(client);
    setHistoryLoading(true);
    try {
      const records = await getClientPurchaseHistory(
        client.id,
        client.full_name || formatClientFullName(client.first_name, client.last_name),
        user.id
      );
      setHistoryRecords(records);
    } catch (e) {
      console.error('Failed fetching history:', e);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Filter & Sort
  const filteredClients = useMemo(() => {
    let result = [...clients];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const full = (c.full_name || '').toLowerCase();
        const ig = (c.instagram || '').toLowerCase();
        const em = (c.email || '').toLowerCase();
        return full.includes(q) || ig.includes(q) || em.includes(q);
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'purchases') {
        return (b.total_purchases || 0) - (a.total_purchases || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'name') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }
      return 0;
    });

    return result;
  }, [clients, searchQuery, sortBy]);


  if (authChecking) {
    return <div className="p-8 text-center text-gray-500">Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to view and manage your clients.</p>
        <Link
          href="/login?next=%2Fclients"
          className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-gray-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1.5">
              <Users size={12} />
              <span>{clients.length} {clients.length === 1 ? 'klient' : 'klientów'}</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Baza artystów i wykonawców kupujących Twoje bity. Połączona automatycznie z modułem Finanse.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Plus size={16} />
          Dodaj Klienta
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute inset-y-0 left-3 my-auto text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwisku, IG lub emailu..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">Sortuj:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="purchases">Najwięcej kupionych bitów</option>
            <option value="newest">Najnowsi klienci</option>
            <option value="name">Alfabetycznie (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Clients Table / List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400 animate-pulse">Ładowanie klientów...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-800">Brak klientów do wyświetlenia</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Brak wyników dla podanej frazy wyszukiwania.'
                : 'Nie dodałeś jeszcze żadnych klientów. Kliknij przycisk poniżej lub dodaj transakcję w module Finanse.'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-all"
              >
                + Dodaj pierwszego klienta
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Klient / Wykonawca</th>
                  <th className="py-3 px-4">Instagram</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Kupione Bity</th>
                  <th className="py-3 px-4 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => {
                  const initials = (client.first_name?.[0] || '') + (client.last_name?.[0] || '');
                  const isVip = (client.total_purchases || 0) >= 3;
                  const isRepeat = (client.total_purchases || 0) > 1;

                  return (
                    <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {initials.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block text-xs">
                              {client.full_name || client.first_name}
                            </span>
                            {client.notes && (
                              <span className="text-[11px] text-gray-400 block line-clamp-1">
                                {client.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Instagram */}
                      <td className="py-3.5 px-4">
                        {client.instagram ? (
                          <a
                            href={`https://instagram.com/${client.instagram.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            @{client.instagram.replace(/^@/, '')}
                            <ExternalLink size={11} className="text-gray-400" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        {client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                          >
                            <Mail size={12} className="text-gray-400" />
                            {client.email}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Purchase History Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewHistory(client)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:scale-105 ${
                            isVip
                              ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                              : isRepeat
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                          title="Kliknij, aby zobaczyć historię kupionych bitów"
                        >
                          <ShoppingBag size={12} />
                          <span>{client.total_purchases || 0} bitów</span>
                          {isVip && <span className="text-[9px] px-1 bg-amber-200/60 rounded">VIP</span>}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/finanse?client=${encodeURIComponent(client.full_name || client.first_name)}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            title="Zapisz sprzedaż w Finansach"
                          >
                            <DollarSign size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleViewHistory(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Historia zakupów"
                          >
                            <History size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                            title="Edytuj klienta"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientToDelete(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="Usuń klienta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT CLIENT                               */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                {editingClient ? 'Edytuj Klienta' : 'Dodaj Nowego Klienta'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Imię *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="np. Travis"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nazwisko</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="np. Scott"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Instagram (@handle)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="travisscott"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Adres Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@artist.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>


              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notatki / Styl muzyczny</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="np. Raper trap/drill z Chicago, woli bity 140 BPM"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold disabled:opacity-50"
                >
                  {formSaving ? 'Zapisywanie...' : editingClient ? 'Zapisz zmiany' : 'Zapisz nowego klienta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PURCHASE HISTORY                                */}
      {/* ======================================================== */}
      {historyClient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <ShoppingBag size={18} className="text-emerald-600" />
                  Historia Zakupów: {historyClient.full_name || historyClient.first_name}
                </h3>
                <span className="text-xs text-gray-500">
                  Łącznie kupionych bitów:{' '}
                  <strong className="text-emerald-600 font-bold">{historyClient.total_purchases || 0}</strong>
                </span>
              </div>
              <button
                onClick={() => setHistoryClient(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
                Wczytywanie historii transakcji...
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <Music size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">Brak zarejestrowanych transakcji w Finansach</p>
                <div className="mt-4">
                  <Link
                    href={`/finanse?client=${encodeURIComponent(
                      historyClient.full_name || historyClient.first_name
                    )}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200"
                  >
                    <Plus size={13} />
                    Zarejestruj nową sprzedaż w Finansach
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                  {historyRecords.map((r) => (
                    <div key={r.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                      <div>
                        <span className="font-bold text-gray-900 block">{r.beat_name}</span>
                        <span className="text-[11px] text-gray-400">
                          {r.license_type} • {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">
                        {r.amount} {r.currency}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-gray-400 text-[11px]">
                    Transakcje pochodzą z bazy modułu Finanse.
                  </span>
                  <Link
                    href={`/finanse?client=${encodeURIComponent(
                      historyClient.full_name || historyClient.first_name
                    )}`}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    + Dodaj kolejną sprzedaż
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 text-right">
              <button
                type="button"
                onClick={() => setHistoryClient(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-xs"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-gray-900 text-base">Usunąć klienta?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Czy na pewno chcesz usunąć klienta{' '}
                <strong className="text-gray-800">
                  {clientToDelete.full_name || clientToDelete.first_name}
                </strong>
                ?
              </p>
              <p className="text-[11px] text-gray-400 mt-2 bg-gray-50 p-2 rounded-xl">
                Wszystkie dotychczasowe transakcje w module Finanse pozostaną nienaruszone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-xs"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                Tak, usuń klienta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Ładowanie klientów...</div>}>
      <ClientsContent />
    </Suspense>
  );
}
