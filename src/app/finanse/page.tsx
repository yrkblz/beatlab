'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Filter, TrendingUp, ChevronDown, Check } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

export default function FinansePage() {
  const [sales, setSales] = useState<any[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [rates, setRates] = useState<Record<string, number>>({});

  const [beatName, setBeatName] = useState('');
  const [clientName, setClientName] = useState('');
  const [licenseType, setLicenseType] = useState('MP3 Lease');
  const [amount, setAmount] = useState('35');
  const [currency, setCurrency] = useState('USD');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [timeFilter, setTimeFilter] = useState('This Year');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecking(false);
      if (user) {
        fetchData(user.id);
        fetchProfile(user.id);
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

  async function handleAddSale(e: React.FormEvent) {
    e.preventDefault();
    
    if (!beatName) {
      alert("Błąd: Proszę wpisać nazwę bitu.");
      return;
    }
    if (!amount) {
      alert("Błąd: Proszę podać kwotę.");
      return;
    }
    if (!user) {
      alert("Błąd: Brak zalogowanego użytkownika.");
      return;
    }

    try {
      const { error } = await supabase.from('sales').insert([
        { 
          beat_name: beatName, 
          client_name: clientName, 
          license_type: licenseType, 
          amount: parseFloat(amount),
          currency: currency,
          created_at: new Date().toISOString(),
          user_id: user.id
        }
      ]);

      if (error) {
        alert(`Błąd bazy danych: ${error.message}`);
        return;
      }

      setBeatName('');
      setClientName('');
      setAmount(licensePrices[licenseType] || '');
      fetchData(user.id);
      
    } catch (err: any) {
      alert(`Wystąpił nieoczekiwany błąd: ${err.message}`);
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
        <a href="/account" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium">Go to Login</a>
      </div>
    );
  }

  // Filter sales based on selected time filter
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const now = new Date();
    
    if (timeFilter === 'This Year') {
      return saleDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'This Month') {
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'Last 7 Days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return saleDate >= sevenDaysAgo;
    }
    if (timeFilter === 'Custom') {
      if (!customDateFrom && !customDateTo) return true;
      if (customDateFrom && new Date(customDateFrom) > saleDate) return false;
      if (customDateTo) {
        const toDate = new Date(customDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (toDate < saleDate) return false;
      }
      return true;
    }
    return true; // 'All'
  });

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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Finance & Sales</h2>
          <p className="text-gray-500 mt-1">Track your profit and manage licenses.</p>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1 border border-gray-200 rounded-lg p-1 bg-white">
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
            <div className="flex items-center space-x-2 mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
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

      <div className="mb-8 space-y-4">
        {/* Top Level: Total Combined Revenue */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
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

      <div className="flex gap-8">
        {/* Left Panel */}
        <div className="w-80 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-8">
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
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client (Optional)</label>
                <input 
                  type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="e.g. Lil Wayne"
                />
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
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">License</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500">No transactions in selected period.</td></tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{sale.beat_name || sale.beats?.title || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.client_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.license_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {(() => {
                          const c = sale.currency || 'USD';
                          return c === 'USD' ? `$${sale.amount.toFixed(2)}` : c === 'EUR' ? `€${sale.amount.toFixed(2)}` : `${sale.amount.toFixed(2)} ${c}`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
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
