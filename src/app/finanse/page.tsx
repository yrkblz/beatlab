'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, 
  Filter, 
  TrendingUp, 
  ChevronDown, 
  Check, 
  User as UserIcon, 
  UserCheck, 
  UserPlus, 
  X, 
  ExternalLink,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  ClientItem,
  fetchClientsWithSales,
  findOrCreateClientByName,
  formatClientFullName,
} from '@/lib/clients-storage';

const LICENSES = ['MP3 Lease', 'WAV Lease', 'Trackout', 'Exclusive'];
const CURRENCIES = ['USD', 'PLN', 'RUB', 'UAH', 'EUR'];
const TIME_FILTERS = ['All', 'This Year', 'This Month', 'Last 7 Days', 'Custom'];

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

function FinanseContent() {
  const searchParams = useSearchParams();
  const prefillClient = searchParams?.get('client');

  const [sales, setSales] = useState<any[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [rates, setRates] = useState<Record<string, number>>({});

  const [beatName, setBeatName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [clientsList, setClientsList] = useState<ClientItem[]>([]);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [licenseType, setLicenseType] = useState('MP3 Lease');
  const [amount, setAmount] = useState('35');
  const [currency, setCurrency] = useState('USD');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [timeFilter, setTimeFilter] = useState('This Year');
  const [clientFilter, setClientFilter] = useState('All');
  const [clientSort, setClientSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Close client dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle URL prefill client
  useEffect(() => {
    if (prefillClient) {
      setClientName(prefillClient);
    }
  }, [prefillClient]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecking(false);
      if (user) {
        fetchData(user.id);
        fetchProfile(user.id);
        fetchClients(user.id);
      } else {
        setLoading(false);
      }
    });

    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setRates(data.rates);
        }
      })
      .catch(err => console.error("Error fetching rates", err));
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('base_currency').eq('id', userId).single();
    if (data && data.base_currency) {
      setDisplayCurrency(data.base_currency);
    }
  }

  async function fetchData(userId: string) {
    setLoading(true);
    const { data } = await supabase.from('sales').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setSales(data);
    setLoading(false);
  }

  async function fetchClients(userId: string) {
    try {
      const data = await fetchClientsWithSales(userId);
      setClientsList(data);
    } catch (e) {
      console.error("Error fetching clients list:", e);
    }
  }

  const licensePrices: Record<string, string> = {
    'MP3 Lease': '35',
    'WAV Lease': '45',
    'Trackout': '75',
    'Exclusive': ''
  };

  function handleLicenseChange(val: string) {
    setLicenseType(val);
    setAmount(licensePrices[val] || '');
  }

  // Filter clients for combobox
  const filteredClients = useMemo(() => {
    const q = clientName.toLowerCase().trim();
    if (!q) return clientsList.slice(0, 8);
    return clientsList.filter(c => {
      const full = (c.full_name || `${c.first_name} ${c.last_name || ''}`).toLowerCase();
      const ig = (c.instagram || '').toLowerCase().replace(/^@/, '');
      const em = (c.email || '').toLowerCase();
      return full.includes(q) || ig.includes(q) || em.includes(q);
    }).slice(0, 8);
  }, [clientsList, clientName]);

  const exactMatchExists = useMemo(() => {
    const q = clientName.toLowerCase().trim();
    if (!q) return false;
    return clientsList.some(c => {
      const full = (c.full_name || `${c.first_name} ${c.last_name || ''}`).toLowerCase().trim();
      return full === q;
    });
  }, [clientsList, clientName]);

  // Generate unique list of clients for filter dropdown
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      if (s.client_name && s.client_name.trim()) set.add(s.client_name.trim());
    });
    clientsList.forEach(c => {
      const full = c.full_name || formatClientFullName(c.first_name, c.last_name);
      if (full) set.add(full);
    });
    return ['All Clients', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [sales, clientsList]);

  // Filter & sort sales based on selected time and client filters
  const filteredSales = useMemo(() => {
    let list = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const now = new Date();
      
      if (timeFilter === 'This Year') {
        if (saleDate.getFullYear() !== now.getFullYear()) return false;
      }
      if (timeFilter === 'This Month') {
        if (saleDate.getMonth() !== now.getMonth() || saleDate.getFullYear() !== now.getFullYear()) return false;
      }
      if (timeFilter === 'Last 7 Days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (saleDate < sevenDaysAgo) return false;
      }
      if (timeFilter === 'Custom') {
        if (customDateFrom && new Date(customDateFrom) > saleDate) return false;
        if (customDateTo) {
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (toDate < saleDate) return false;
        }
      }

      if (clientFilter && clientFilter !== 'All Clients' && clientFilter !== 'All') {
        const sClient = (sale.client_name || '').toLowerCase().trim();
        if (sClient !== clientFilter.toLowerCase().trim()) return false;
      }

      return true;
    });

    if (clientSort === 'asc') {
      list.sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''));
    } else if (clientSort === 'desc') {
      list.sort((a, b) => (b.client_name || '').localeCompare(a.client_name || ''));
    }

    return list;
  }, [sales, timeFilter, customDateFrom, customDateTo, clientFilter, clientSort]);

  let combinedTotal = 0;
  if (Object.keys(rates).length > 0) {
    filteredSales.forEach(sale => {
      const saleCurrency = sale.currency || 'USD';
      const amountInUSD = saleCurrency === 'USD' ? sale.amount : sale.amount / (rates[saleCurrency] || 1);
      const amountInTarget = displayCurrency === 'USD' ? amountInUSD : amountInUSD * (rates[displayCurrency] || 1);
      combinedTotal += amountInTarget;
    });
  } else {
    // Fallback if rates failed or loading
    combinedTotal = filteredSales.reduce((sum, sale) => {
      if ((sale.currency || 'USD') === displayCurrency) {
        return sum + sale.amount;
      }
      return sum;
    }, 0);
  }

  async function handleAddSale(e: React.FormEvent) {
    e.preventDefault();
    
    if (!beatName) {
      alert("Error: Please enter the beat title.");
      return;
    }
    if (!amount) {
      alert("Error: Please enter an amount.");
      return;
    }
    if (!user) {
      alert("Error: No logged-in user found.");
      return;
    }

    try {
      let finalClientId: string | null = selectedClient?.id || null;
      let finalClientName = clientName.trim();

      // If client name is provided, auto-find or create the client in database
      if (finalClientName) {
        try {
          const client = await findOrCreateClientByName(finalClientName, user.id);
          finalClientId = client.id;
          finalClientName = client.full_name || formatClientFullName(client.first_name, client.last_name) || finalClientName;
        } catch (clientErr) {
          console.error("Error finding/creating client:", clientErr);
        }
      }

      const payload: any = { 
        beat_name: beatName, 
        client_name: finalClientName, 
        license_type: licenseType, 
        amount: parseFloat(amount),
        currency: currency,
        created_at: new Date().toISOString(),
        user_id: user.id
      };

      if (finalClientId) {
        payload.client_id = finalClientId;
      }

      let { error } = await supabase.from('sales').insert([payload]);

      // Fallback if client_id column is not yet migrated in Supabase table
      if (error && error.message?.includes('client_id')) {
        delete payload.client_id;
        const retry = await supabase.from('sales').insert([payload]);
        error = retry.error;
      }

      if (error) {
        alert(`Database error: ${error.message}`);
        return;
      }

      setBeatName('');
      setClientName('');
      setSelectedClient(null);
      setAmount(licensePrices[licenseType] || '');
      fetchData(user.id);
      fetchClients(user.id);
      
    } catch (err: any) {
      alert(`An unexpected error occurred: ${err.message}`);
    }
  }

  if (authChecking) {
    return <div className="p-8 text-center text-gray-500">Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to view and manage your finances.</p>
        <a href="/login?next=%2Ffinanse" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium">Go to Login</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Finance & Sales</h2>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
            >
              <Users size={14} className="text-gray-500" />
              <span>Clients Database</span>
            </Link>
          </div>
          <p className="text-gray-500 mt-1">Track your profit and manage licenses.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
          {/* Client Filter Dropdown */}
          <div className="w-48 shrink-0">
            <CustomSelect
              options={uniqueClients}
              value={clientFilter === 'All' ? 'All Clients' : clientFilter}
              onChange={(val) => setClientFilter(val === 'All Clients' ? 'All' : val)}
              placeholder="All Clients"
            />
          </div>

          <div className="flex flex-col items-end">
            <div className="flex flex-wrap items-center space-x-1 border border-gray-200 rounded-lg p-1 bg-white">
              <div className="px-2 text-gray-400"><Filter size={16} /></div>
              {TIME_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeFilter === f ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          
          {timeFilter === 'Custom' && (
            <div className="flex flex-wrap items-center gap-2 mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="text-xs font-semibold text-gray-500 uppercase ml-1">From:</span>
              <div className="border border-gray-200 rounded-md px-2 py-1 focus-within:border-black bg-white flex items-center">
                <DatePicker 
                  selected={customDateFrom ? new Date(customDateFrom) : null} 
                  onChange={(date: Date | null) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setCustomDateFrom(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setCustomDateFrom('');
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Start date"
                  isClearable
                  className="text-sm bg-transparent border-none focus:outline-none w-28 text-gray-700"
                />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase ml-2">To:</span>
              <div className="border border-gray-200 rounded-md px-2 py-1 focus-within:border-black bg-white flex items-center">
                <DatePicker 
                  selected={customDateTo ? new Date(customDateTo) : null} 
                  onChange={(date: Date | null) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setCustomDateTo(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setCustomDateTo('');
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="End date"
                  isClearable
                  className="text-sm bg-transparent border-none focus:outline-none w-28 text-gray-700"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      <div className="mb-8 space-y-4">
        {/* Top Level: Total Combined Revenue */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-5 border ${displayCurrency === 'USD' ? 'bg-blue-50 border-blue-100' : displayCurrency === 'PLN' ? 'bg-red-50 border-red-100' : displayCurrency === 'EUR' ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'}`}>
              <TrendingUp size={24} className={`${displayCurrency === 'USD' ? 'text-blue-500' : displayCurrency === 'PLN' ? 'text-red-500' : displayCurrency === 'EUR' ? 'text-yellow-600' : 'text-green-500'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Combined Revenue ({timeFilter})</p>
              <p className="text-3xl font-bold text-gray-900">
                {displayCurrency === 'USD' ? '$' : displayCurrency === 'EUR' ? '€' : ''}{combinedTotal.toFixed(2)} {['PLN', 'RUB', 'UAH'].includes(displayCurrency) ? displayCurrency : ''}
              </p>
            </div>
          </div>
          
          <div className="w-32">
            <CustomSelect options={CURRENCIES} value={displayCurrency} onChange={setDisplayCurrency} />
          </div>
        </div>

        {/* Second Level: Individual Currency Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {CURRENCIES.map(curr => {
            const sumForCurr = filteredSales
              .filter(s => (s.currency || 'USD') === curr)
              .reduce((sum, sale) => sum + sale.amount, 0);
            
            return (
              <div key={curr} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Only {curr}</p>
                <p className="text-xl font-bold text-gray-900">
                  {curr === 'USD' ? '$' : curr === 'EUR' ? '€' : ''}{sumForCurr.toFixed(2)} {['PLN', 'RUB', 'UAH'].includes(curr) ? curr : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:sticky lg:top-8">
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <span className="text-xl mr-2 font-normal">+</span> Add new sale
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Beat Name *</label>
                <input 
                  type="text" value={beatName} onChange={e => setBeatName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="e.g. Dark Knight"
                />
              </div>
              
              {/* Smart Client Combobox */}
              <div className="relative" ref={clientDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Client (Optional)</label>
                  {selectedClient && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <UserCheck size={11} />
                      Linked to DB
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={clientName} 
                    onChange={e => {
                      setClientName(e.target.value);
                      setIsClientMenuOpen(true);
                      if (selectedClient && e.target.value !== selectedClient.full_name) {
                        setSelectedClient(null);
                      }
                    }}
                    onFocus={() => setIsClientMenuOpen(true)}
                    onClick={() => setIsClientMenuOpen(true)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:border-black transition-colors"
                    placeholder="Search or enter client name (e.g. Lil Wayne), @handle or email..."
                  />
                  {clientName && (
                    <button
                      type="button"
                      onClick={() => {
                        setClientName('');
                        setSelectedClient(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      title="Clear client"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Combobox Dropdown */}
                {isClientMenuOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {filteredClients.length > 0 && (
                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Existing Clients
                        </div>
                        {filteredClients.map(c => {
                          const fullName = c.full_name || formatClientFullName(c.first_name, c.last_name);
                          const isSelected = selectedClient?.id === c.id || clientName.trim().toLowerCase() === fullName.toLowerCase();
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setClientName(fullName);
                                setSelectedClient(c);
                                setIsClientMenuOpen(false);
                              }}
                              className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-blue-50/60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                                  {(c.first_name?.[0] || 'C').toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <span className="font-semibold text-gray-900 block truncate">{fullName}</span>
                                  <span className="text-[10px] text-gray-400 block truncate">
                                    {c.instagram ? `@${c.instagram.replace(/^@/, '')}` : c.email || 'No contact info'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                  {c.total_purchases || 0} beats
                                </span>
                                {isSelected && <Check size={14} className="text-black" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Auto-create option if typed client doesn't exist */}
                    {clientName.trim() && !exactMatchExists && (
                      <div 
                        onClick={() => {
                          setIsClientMenuOpen(false);
                        }}
                        className="px-3 py-2.5 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center gap-2 transition-colors font-medium"
                      >
                        <UserPlus size={14} className="shrink-0 text-blue-600" />
                        <div className="truncate">
                          <span>+ Add as new client: </span>
                          <strong className="text-blue-900">"{clientName.trim()}"</strong>
                          <span className="text-[10px] text-gray-400 block font-normal">Will be automatically saved to your client database</span>
                        </div>
                      </div>
                    )}

                    {filteredClients.length === 0 && !clientName.trim() && (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No clients found. Type a name to add a new client.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">License Type</label>
                <CustomSelect options={LICENSES} value={licenseType} onChange={handleLicenseChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount *</label>
                  <input 
                    type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                    placeholder="35"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                  <CustomSelect options={CURRENCIES} value={currency} onChange={setCurrency} />
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleAddSale as any}
                className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors mt-4"
              >
                Add Revenue
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full divide-y divide-gray-100 block md:table">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beat</th>
                  <th 
                    onClick={() => {
                      setClientSort(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none');
                    }}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none transition-colors"
                    title="Sort by client name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Client</span>
                      {clientSort === 'asc' ? (
                        <ArrowUp size={14} className="text-black" />
                      ) : clientSort === 'desc' ? (
                        <ArrowDown size={14} className="text-black" />
                      ) : (
                        <ArrowUpDown size={14} className="text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">License</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white block md:table-row-group">
                {loading ? (
                  <tr className="block md:table-row"><td colSpan={6} className="p-8 text-center text-gray-500 block md:table-cell">Loading...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr className="block md:table-row"><td colSpan={6} className="p-12 text-center text-gray-500 block md:table-cell">No transactions in selected period.</td></tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr key={sale.id} className="p-4 md:p-0 block md:table-row hover:bg-gray-50/80 transition-colors">
                      <td className="block md:table-cell md:px-6 md:py-4 py-1 font-bold text-gray-900 text-base md:text-sm">{sale.beat_name || sale.beats?.title || 'Unknown'}</td>
                      <td className="block md:table-cell md:px-6 md:py-4 py-1 text-sm text-gray-600">
                        <span className="inline-block md:hidden text-xs text-gray-400 uppercase font-semibold mr-2">Client:</span>
                        {sale.client_name ? (
                          <Link
                            href={`/clients?search=${encodeURIComponent(sale.client_name)}`}
                            className="text-gray-900 font-medium hover:underline hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
                            title="View client details in Clients tab"
                          >
                            <span>{sale.client_name}</span>
                            <ExternalLink size={11} className="text-gray-400" />
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 py-1 text-sm text-gray-600">
                        <span className="inline-block md:hidden text-xs text-gray-400 uppercase font-semibold mr-2">License:</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium md:bg-transparent md:p-0 md:text-sm">{sale.license_type}</span>
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 py-1 text-sm text-gray-500">
                        <span className="inline-block md:hidden text-xs text-gray-400 uppercase font-semibold mr-2">Date:</span>
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 py-1 font-medium text-gray-900">
                        <span className="inline-block md:hidden text-xs text-gray-400 uppercase font-semibold mr-2">Amount:</span>
                        {(() => {
                          const c = sale.currency || 'USD';
                          return c === 'USD' ? `${sale.amount.toFixed(2)}` : c === 'EUR' ? `€${sale.amount.toFixed(2)}` : `${sale.amount.toFixed(2)} ${c}`;
                        })()}
                      </td>
                      <td className="block md:table-cell md:px-6 md:py-4 py-2 text-left md:text-right pt-2 md:pt-4 border-t border-gray-100 md:border-t-0">
                        <button onClick={() => setSaleToDelete(sale.id)} className="text-red-400 hover:text-red-600 font-medium text-sm transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {saleToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Sale</h3>
            <p className="text-gray-500 mb-6 text-sm">Are you sure you want to delete this sale? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSaleToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const id = saleToDelete;
                  setSaleToDelete(null);
                  await supabase.from('sales').delete().eq('id', id);
                  if (user) fetchData(user.id);
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinansePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading finance data...</div>}>
      <FinanseContent />
    </Suspense>
  );
}
