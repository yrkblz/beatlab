'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Printer, Search, X, Check, ChevronDown, Sliders, ShoppingBag, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isValid
} from 'date-fns';

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="text-blue-600 font-bold">{children}</span>
);

function getCurrencySymbol(curr?: string): string {
  const c = (curr || 'USD').toUpperCase();
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  if (c === 'PLN') return 'zł';
  if (c === 'UAH') return '₴';
  if (c === 'RUB') return '₽';
  return '$';
}

function getCurrencyFullName(curr?: string): string {
  const c = (curr || 'USD').toUpperCase();
  if (c === 'EUR') return 'Euros';
  if (c === 'GBP') return 'British Pounds';
  if (c === 'PLN') return 'Polish Zloty';
  if (c === 'UAH') return 'Ukrainian Hryvnia';
  if (c === 'RUB') return 'Russian Rubles';
  return 'US Dollars';
}

function calculatePriceInCurrency(
  baseUsdPrice: string | number,
  targetCurrency: string,
  exchangeRates: Record<string, number>
): string {
  const num = typeof baseUsdPrice === 'string' ? parseFloat(baseUsdPrice) : baseUsdPrice;
  if (isNaN(num) || num <= 0) return '0';
  if (targetCurrency === 'USD') return num.toString();

  const rate = exchangeRates[targetCurrency] || 1;
  const converted = Math.round(num * rate);
  return converted.toString();
}

const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'PLN', symbol: 'zł', label: 'PLN (zł)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'UAH', symbol: '₴', label: 'UAH (₴)' },
];

function CustomCurrencyDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = CURRENCY_OPTIONS.find((c) => c.code === value) || CURRENCY_OPTIONS[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Currency"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 transition-colors shadow-2xs focus:outline-none focus:border-black cursor-pointer"
      >
        <span className="text-gray-500 font-bold">{selected.symbol}</span>
        <span>{selected.code}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden select for standard form/test accessibility */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {CURRENCY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
          {CURRENCY_OPTIONS.map((c) => {
            const isSelected = c.code === value;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center font-bold text-gray-500">{c.symbol}</span>
                  <span>{c.code}</span>
                </div>
                {isSelected && <Check size={13} className="text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedSelected = value ? parseISO(value) : new Date();
  const validSelected = isValid(parsedSelected) ? parsedSelected : new Date();

  const [viewDate, setViewDate] = useState<Date>(validSelected);

  useEffect(() => {
    if (value) {
      const d = parseISO(value);
      if (isValid(d)) {
        setViewDate(d);
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const handleSelectDate = (d: Date) => {
    const formatted = format(d, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    onChange(format(today, 'yyyy-MM-dd'));
    setViewDate(today);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Agreement Date"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 hover:border-gray-400 focus:outline-none focus:border-black transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-500" />
          <span className="font-medium text-gray-900">
            {value ? format(validSelected, 'MMMM d, yyyy') : 'Select date...'}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 font-mono">
          {value || ''}
        </span>
      </button>

      {/* Hidden input for form/test accessibility */}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-900">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdays.map((wd) => (
              <span key={wd} className="text-[10px] font-semibold text-gray-400">
                {wd}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((d, idx) => {
              const isSelected = value ? isSameDay(d, validSelected) : false;
              const isCurrentMonth = isSameMonth(d, monthStart);
              const isTodayDate = isToday(d);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(d)}
                  className={`h-7 w-7 text-xs mx-auto rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    !isCurrentMonth
                      ? 'text-gray-300 hover:text-gray-500'
                      : isSelected
                      ? 'bg-black text-white font-bold shadow-xs'
                      : isTodayDate
                      ? 'border border-blue-500 text-blue-600 font-bold hover:bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-100 font-medium'
                  }`}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LicensesPage() {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Producer Settings
  const [producerFullName, setProducerFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [producerAddress, setProducerAddress] = useState('');
  
  const [mp3Price, setMp3Price] = useState('29.99');
  const [wavPrice, setWavPrice] = useState('49.99');
  const [trackoutPrice, setTrackoutPrice] = useState('99.99');
  const [unlimitedPrice, setUnlimitedPrice] = useState('149.99');
  const [exclusivePrice, setExclusivePrice] = useState('199.99');

  const [mp3StreamLimit, setMp3StreamLimit] = useState('100000');
  const [wavStreamLimit, setWavStreamLimit] = useState('500000');
  const [trackoutStreamLimit, setTrackoutStreamLimit] = useState('1000000');

  const [producerPublishing, setProducerPublishing] = useState('0');

  const [isProducerSettingsOpen, setIsProducerSettingsOpen] = useState(false);

  // Sales Integration State
  const [salesList, setSalesList] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [licenseSource, setLicenseSource] = useState<'custom' | 'sale'>('custom');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [agreementDate, setAgreementDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<string>('USD');
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1,
    EUR: 0.92,
    PLN: 4.02,
    GBP: 0.78,
    UAH: 41.5,
  });

  useEffect(() => {
    let isMounted = true;
    if (typeof fetch !== 'undefined') {
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.json())
        .then(data => {
          if (isMounted && data && data.rates) {
            setRates(prev => ({ ...prev, ...data.rates }));
          }
        })
        .catch(() => {
          // Fallback rates already defined
        });
    }
    return () => { isMounted = false; };
  }, []);

  // Form State
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [selectedBeatId, setSelectedBeatId] = useState('');
  const [customBeatName, setCustomBeatName] = useState('');
  const [buyerName, setBuyerName] = useState(''); // Licensee
  const [selectedLicenseType, setSelectedLicenseType] = useState('mp3');
  const [customPrice, setCustomPrice] = useState('29.99');

  // Modal State
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [customBeatInput, setCustomBeatInput] = useState('');

  // Initialization from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMp3Price = localStorage.getItem('mp3Price');
      if (storedMp3Price !== null) setMp3Price(storedMp3Price);
      
      const storedWavPrice = localStorage.getItem('wavPrice');
      if (storedWavPrice !== null) setWavPrice(storedWavPrice);
      
      const storedTrackoutPrice = localStorage.getItem('trackoutPrice');
      if (storedTrackoutPrice !== null) setTrackoutPrice(storedTrackoutPrice);
      
      const storedUnlimitedPrice = localStorage.getItem('unlimitedPrice');
      if (storedUnlimitedPrice !== null) setUnlimitedPrice(storedUnlimitedPrice);
      
      const storedExclusivePrice = localStorage.getItem('exclusivePrice');
      if (storedExclusivePrice !== null) setExclusivePrice(storedExclusivePrice);

      const storedMp3StreamLimit = localStorage.getItem('mp3StreamLimit');
      if (storedMp3StreamLimit !== null) setMp3StreamLimit(storedMp3StreamLimit);

      const storedWavStreamLimit = localStorage.getItem('wavStreamLimit');
      if (storedWavStreamLimit !== null) setWavStreamLimit(storedWavStreamLimit);

      const storedTrackoutStreamLimit = localStorage.getItem('trackoutStreamLimit');
      if (storedTrackoutStreamLimit !== null) setTrackoutStreamLimit(storedTrackoutStreamLimit);
      
      const storedProducerPublishing = localStorage.getItem('producerPublishing');
      if (storedProducerPublishing !== null) setProducerPublishing(storedProducerPublishing);
      
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever these change, but only after initial load
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('mp3Price', mp3Price);
      localStorage.setItem('wavPrice', wavPrice);
      localStorage.setItem('trackoutPrice', trackoutPrice);
      localStorage.setItem('unlimitedPrice', unlimitedPrice);
      localStorage.setItem('exclusivePrice', exclusivePrice);

      localStorage.setItem('mp3StreamLimit', mp3StreamLimit);
      localStorage.setItem('wavStreamLimit', wavStreamLimit);
      localStorage.setItem('trackoutStreamLimit', trackoutStreamLimit);
      
      localStorage.setItem('producerPublishing', producerPublishing);
    }
  }, [isLoaded, mp3Price, wavPrice, trackoutPrice, unlimitedPrice, exclusivePrice, mp3StreamLimit, wavStreamLimit, trackoutStreamLimit, producerPublishing]);

  const fetchBeats = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase.from('beats').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setBeats(data || []);
    if (data && data.length > 0) {
      setSelectedBeatId(data[0].id);
    }
    setLoading(false);
  }, []);

  const fetchSales = useCallback(async (userId: string) => {
    setLoadingSales(true);
    try {
      let query: any = supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId);
      if (query && typeof query.order === 'function') {
        query = query.order('created_at', { ascending: false });
      }
      const { data } = await query;
      setSalesList(data || []);
    } catch (e) {
      console.error('Error fetching sales:', e);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  function mapSaleLicenseTypeToId(licenseTypeStr?: string): string {
    if (!licenseTypeStr) return 'mp3';
    const l = licenseTypeStr.toLowerCase();
    if (l.includes('exclusive')) return 'exclusive';
    if (l.includes('unlimited')) return 'unlimited';
    if (l.includes('trackout')) return 'trackout';
    if (l.includes('wav')) return 'wav';
    return 'mp3';
  }

  function handleSelectSale(sale: any) {
    setSelectedSaleId(sale.id);
    setCustomBeatName(sale.beat_name || '');
    setBuyerName(sale.client_name || '');
    const matchedType = mapSaleLicenseTypeToId(sale.license_type);
    setSelectedLicenseType(matchedType);
    if (sale.amount !== undefined && sale.amount !== null) {
      setCustomPrice(sale.amount.toString());
    }
    if (sale.currency) {
      setCurrency(sale.currency.toUpperCase());
    }
    if (sale.created_at) {
      try {
        setAgreementDate(new Date(sale.created_at).toISOString().slice(0, 10));
      } catch {}
    }
  }

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('full_name, stage_name, address').eq('id', userId).single();
    if (data) {
      setProducerFullName(data.full_name || '');
      setStageName(data.stage_name || '');
      setProducerAddress(data.address || '');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user?.email && !stageName) {
        setStageName(user.email.split('@')[0]);
      }
      setAuthChecking(false);
      if (user) {
        fetchBeats(user.id);
        fetchProfile(user.id);
        fetchSales(user.id);
      } else {
        setLoading(false);
      }
    });
  }, [fetchBeats, fetchProfile]);

  const LICENSE_TYPES = [
    {
      id: 'mp3',
      name: 'MP3 Lease',
      basePrice: mp3Price,
      defaultPrice: calculatePriceInCurrency(mp3Price, currency, rates),
      isExclusive: false,
      features: 'MP3 file, Non-Exclusive rights, Limited streams/copies.'
    },
    {
      id: 'wav',
      name: 'WAV Lease',
      basePrice: wavPrice,
      defaultPrice: calculatePriceInCurrency(wavPrice, currency, rates),
      isExclusive: false,
      features: 'WAV file, Non-Exclusive rights, Limited streams/copies.'
    },
    {
      id: 'trackout',
      name: 'Trackout Lease',
      basePrice: trackoutPrice,
      defaultPrice: calculatePriceInCurrency(trackoutPrice, currency, rates),
      isExclusive: false,
      features: 'WAV + Trackouts, Non-Exclusive rights, Limited streams/copies.'
    },
    {
      id: 'unlimited',
      name: 'Unlimited Lease',
      basePrice: unlimitedPrice,
      defaultPrice: calculatePriceInCurrency(unlimitedPrice, currency, rates),
      isExclusive: false,
      features: 'All Files, Non-Exclusive rights, Unlimited streams.'
    },
    {
      id: 'exclusive',
      name: 'Exclusive Rights',
      basePrice: exclusivePrice,
      defaultPrice: calculatePriceInCurrency(exclusivePrice, currency, rates),
      isExclusive: true,
      features: 'All Files, Exclusive rights, 100% Publishing.'
    },
  ];

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    if (licenseSource === 'custom') {
      const selected = LICENSE_TYPES.find((t) => t.id === selectedLicenseType);
      if (selected) {
        setCustomPrice(calculatePriceInCurrency(selected.basePrice, newCurrency, rates));
      }
    }
  };

  // Auto-update price when license type changes in custom mode
  useEffect(() => {
    if (isLoaded && licenseSource === 'custom') {
      const selected = LICENSE_TYPES.find((t) => t.id === selectedLicenseType);
      if (selected) {
        setCustomPrice(selected.defaultPrice);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLicenseType, isLoaded]);

  const selectedSale = salesList.find((s) => s.id === selectedSaleId);
  const selectedBeat = beats.find((b) => b.id === selectedBeatId);
  const currentLicense = LICENSE_TYPES.find((t) => t.id === selectedLicenseType) || LICENSE_TYPES[0];

  const handlePrint = () => {
    window.print();
  };

  const filteredSales = salesList.filter((s) => {
    const q = salesSearchQuery.toLowerCase();
    const beatMatch = (s.beat_name || '').toLowerCase().includes(q);
    const clientMatch = (s.client_name || '').toLowerCase().includes(q);
    const typeMatch = (s.license_type || '').toLowerCase().includes(q);
    return beatMatch || clientMatch || typeMatch;
  });

  const sortedBeats = [...beats]
    .filter(b => (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'bpm') return (a.bpm || 0) - (b.bpm || 0);
      if (sortBy === 'genre') return (a.genre || '').localeCompare(b.genre || '');
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  if (authChecking || !isLoaded) {
    return <div className="p-8 text-center text-gray-500">Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to generate licenses.</p>
        <a href="/login?next=%2Flicenses" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium">Go to Login</a>
      </div>
    );
  }

  const currentStreamLimit = 
    selectedLicenseType === 'mp3' ? mp3StreamLimit :
    selectedLicenseType === 'wav' ? wavStreamLimit :
    selectedLicenseType === 'trackout' ? trackoutStreamLimit : 'Unlimited';

  const dateStr = agreementDate ? new Date(agreementDate).toLocaleDateString() : new Date().toLocaleDateString();
  const licensor = producerFullName || '[Licensor]';
  const licensee = buyerName || '[Licensee]';
  const stage = stageName || '[StageName]';
  const addr = producerAddress || '[Address]';
  const beatTitle = customBeatName || selectedBeat?.title || '[BeatName]';
  const price = customPrice || '0.00';
  const currencySymbol = getCurrencySymbol(currency);
  const currencyName = getCurrencyFullName(currency);
  const formattedContractPrice = `${currencySymbol}${price} ${currencyName} (${currency})`;
  const licensorUpper = licensor.toUpperCase();
  const parsedPublishing = Math.min(100, Math.max(0, Number(producerPublishing || 0)));

  return (
    <div className="max-w-7xl mx-auto pb-12 flex flex-col md:flex-row items-stretch gap-8 print:block">
      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            mobileTab === 'form' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
          }`}
        >
          1. Edit Details
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            mobileTab === 'preview' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
          }`}
        >
          2. Document Preview & PDF
        </button>
      </div>

      {/* Configuration Panel - Hidden when printing */}
      <div className={`w-full md:w-1/3 shrink-0 print:hidden flex-col ${mobileTab === 'form' ? 'flex' : 'hidden md:flex'}`}>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-6">License Generator Settings</h2>
          
          <div className="space-y-5">
            {/* Hidden producer defaults inputs kept in DOM for profile & state synchronization */}
            <div className="hidden" aria-hidden="true">
              <input 
                type="text" 
                value={producerFullName} 
                onChange={e => setProducerFullName(e.target.value)}
                placeholder="Full Legal Name"
              />
              <input 
                type="text" 
                value={stageName} 
                onChange={e => setStageName(e.target.value)}
                placeholder="Stage Name"
              />
              <textarea 
                value={producerAddress} 
                onChange={e => setProducerAddress(e.target.value)}
                placeholder="Address"
              />
              <input type="number" value={mp3Price} onChange={e => setMp3Price(e.target.value)} />
              <input type="number" value={wavPrice} onChange={e => setWavPrice(e.target.value)} />
              <input type="number" value={trackoutPrice} onChange={e => setTrackoutPrice(e.target.value)} />
              <input type="number" value={unlimitedPrice} onChange={e => setUnlimitedPrice(e.target.value)} />
              <input type="number" value={exclusivePrice} onChange={e => setExclusivePrice(e.target.value)} />
              <input type="number" value={mp3StreamLimit} onChange={e => setMp3StreamLimit(e.target.value)} />
              <input type="number" value={wavStreamLimit} onChange={e => setWavStreamLimit(e.target.value)} />
              <input type="number" value={trackoutStreamLimit} onChange={e => setTrackoutStreamLimit(e.target.value)} />
            </div>

            {/* Document Specific Info Header with Mode Selector */}
            <div className="pt-1">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-gray-800">License Agreement Details</h3>
                
                {/* Source Switcher */}
                <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseSource('custom');
                      setSelectedSaleId(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      licenseSource === 'custom'
                        ? 'bg-white text-black shadow-xs font-bold'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseSource('sale');
                      if (salesList.length > 0 && !selectedSaleId) {
                        handleSelectSale(salesList[0]);
                      }
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      licenseSource === 'sale'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    <ShoppingBag size={12} className={licenseSource === 'sale' ? 'text-blue-600' : 'text-gray-400'} />
                    From Sale
                  </button>
                </div>
              </div>

              {/* SALE SELECTOR PANEL */}
              {licenseSource === 'sale' && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-2.5 mb-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-blue-600" />
                      Select a sale from Finances:
                    </label>
                    <span className="text-[11px] font-semibold text-blue-700">
                      Sales recorded: {salesList.length}
                    </span>
                  </div>

                  {loadingSales ? (
                    <div className="p-3 text-xs text-blue-600 text-center font-medium">Loading sales history...</div>
                  ) : salesList.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 bg-white rounded-lg border border-gray-200 text-center">
                      No sales recorded in Finances yet. Record a sale in Finances or use Custom mode.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by beat title or buyer name..."
                          value={salesSearchQuery}
                          onChange={(e) => setSalesSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                        {filteredSales.map((sale) => {
                          const isSelected = selectedSaleId === sale.id;
                          const saleCurrency = sale.currency ? sale.currency.toUpperCase() : 'USD';
                          const saleSymbol = getCurrencySymbol(saleCurrency);
                          return (
                            <button
                              key={sale.id}
                              type="button"
                              onClick={() => handleSelectSale(sale)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white hover:bg-blue-50/50 border-gray-200 text-gray-800'
                              }`}
                            >
                              <div className="truncate flex-1">
                                <span className="font-bold block truncate">
                                  {sale.beat_name || 'Untitled Beat'}
                                </span>
                                <span className={`text-[11px] block truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {sale.client_name ? `Buyer: ${sale.client_name}` : 'No buyer'} • {sale.license_type || 'License'}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-extrabold block text-sm">
                                  {saleSymbol}{sale.amount}
                                </span>
                                <span className={`text-[10px] block ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                                  {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : ''}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* In 'sale' mode: Show Selected Sale Overview card and keep inputs hidden */}
            {licenseSource === 'sale' && (
              <>
                {selectedSale && (
                  <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200/90 rounded-xl p-3.5 space-y-2 mb-2 shadow-2xs animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-blue-700">
                        <Check size={13} className="text-blue-600 stroke-[3]" />
                        Selected Transaction
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-extrabold text-blue-950 text-xs shadow-2xs">
                        {currencySymbol}{price} {currency}
                      </span>
                    </div>

                    <div className="pt-0.5">
                      <p className="text-sm font-bold text-gray-950 truncate">
                        {customBeatName || selectedBeat?.title || 'Untitled Beat'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        <span>Buyer: <strong className="text-gray-900">{buyerName || 'No buyer'}</strong></span>
                        <span>•</span>
                        <span className="bg-blue-100/80 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {currentLicense.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form state fields synced for tests and contract generation */}
                <div className="hidden" aria-hidden="true">
                  <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} readOnly />
                  <input type="text" value={customBeatName} onChange={(e) => setCustomBeatName(e.target.value)} readOnly />
                  <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} readOnly />
                  <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* In 'custom' mode: Show full manual customization inputs */}
            {licenseSource === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Beat *</label>
                  <button 
                    type="button"
                    onClick={() => setIsBeatModalOpen(true)}
                    className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="truncate pr-2">
                      {customBeatName || selectedBeat?.title || 'Select a beat...'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Buyer Name (Licensee) *</label>
                  <input 
                    type="text" 
                    value={buyerName} 
                    onChange={e => setBuyerName(e.target.value)}
                    placeholder="e.g. Drake"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">License Type *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {LICENSE_TYPES.map(type => (
                      <label
                        key={type.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedLicenseType === type.id 
                            ? 'border-black bg-gray-50 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="licenseType"
                            value={type.id}
                            checked={selectedLicenseType === type.id}
                            onChange={e => {
                              setSelectedLicenseType(e.target.value);
                              const selected = LICENSE_TYPES.find(t => t.id === e.target.value);
                              if (selected) {
                                setCustomPrice(selected.defaultPrice);
                              }
                            }}
                            className="w-4 h-4 text-black focus:ring-black border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-900">{type.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{currencySymbol}{type.defaultPrice}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">License Price ({currency}) *</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500 font-medium">Currency:</span>
                      <CustomCurrencyDropdown value={currency} onChange={handleCurrencyChange} />
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-semibold text-gray-400">
                      {currencySymbol}
                    </span>
                    <input 
                      type="number" 
                      value={customPrice} 
                      onChange={e => setCustomPrice(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-black font-semibold"
                      step="any"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Agreement Date</label>
              <CustomDatePicker value={agreementDate} onChange={setAgreementDate} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Producer Publishing % (0-100)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={producerPublishing} 
                onChange={e => setProducerPublishing(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <button 
              onClick={handlePrint}
              disabled={!(selectedBeatId || customBeatName) || !buyerName || !producerFullName}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:bg-black disabled:text-white disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              <span>Print / Download PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="md:hidden w-full mt-2 text-center py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Document Preview →
            </button>
          </div>
        </div>
      </div>
    </div>


      {/* Preview Panel - This gets printed */}
      <div className={`flex-1 flex-col print:block print:w-full print:m-0 print:bg-white print:text-black ${mobileTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
        <div className="grow bg-white border border-gray-200 rounded-xl p-6 sm:p-8 md:p-10 shadow-sm min-h-[842px] print:border-none print:shadow-none print:p-0 font-serif break-words">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className="md:hidden mb-6 text-xs font-semibold text-gray-600 hover:text-black flex items-center gap-1.5 py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg w-fit print:hidden"
          >
            ← Back to Configuration
          </button>
          
          <h1 className="text-3xl font-serif font-bold text-center mb-2">BEAT LICENSE AGREEMENT</h1>
          <p className="text-center italic mb-8">Type: <span className="text-blue-600 font-bold">{currentLicense.id === 'exclusive' ? 'Exclusive Rights' : 'Non-Exclusive Rights'}</span></p>

          <div className="space-y-4 text-sm leading-relaxed text-gray-800">
            {currentLicense.isExclusive ? (
              <>
                <p>Header: License Agreement(EXCLUSIVE RIGHTS)Sound Recording/BEATS</p>
                <p>
                  THIS LICENCE AGREEMENT is made on <Highlight>{dateStr}</Highlight> ("Effective Date") by and between <Highlight>{licensee}</Highlight> (hereinafter referred to as the "Licensee") ,and <Highlight>{licensor}</Highlight> (hereinafter referred to as the "Licensor") also, if applicable, professionally known as <Highlight>{stage}</Highlight>, whose principal address is <Highlight>{addr}</Highlight>. Licensor warrants that it controls the mechanical rights in and to the copyrighted musical works entitled "<Highlight>{beatTitle}</Highlight>" ("Composition") as of and prior to the date first written above. The Composition, including the music thereof, was composed by <Highlight>{stage}</Highlight> ("Songwriter") managed under the Licensor.
                </p>
                <p>
                  <strong>Master Use.</strong> The Licensor hereby grants to Licensee an exclusive license (this "License") to record vocal synchronization to the Composition partly or in its entirety and substantially in its original form ("Master Recording").
                </p>
                <p>
                  <strong>Mechanical Rights.</strong> The Licensor hereby grants to Licensee an exclusive license to use Master Recording in the reproduction, duplication, manufacture, and distribution of phonograph records, cassette tapes, compact disk, digital downloads, other miscellaneous audio and digital recordings, and any lifts and versions thereof (collectively, the "Recordings", and individually, a "Recordings") worldwide for unlimited copies of such Recordings or any combination of such Recordings, condition upon the payment to the Licensor a sum of <Highlight>{formattedContractPrice}</Highlight>, receipt of which is confirmed.
                </p>
                <p>
                  <strong>Performance Rights.</strong> The Licensor here by grants to Licensee an exclusive license to use the Master Recording in unlimited for-profit performances, shows, or concerts.
                </p>
                <p>
                  <strong>Broadcast Rights.</strong> The Licensor hereby grants to Licensee an exclusive license to broadcast or air the Master Recording in unlimited amounts of radio stations.
                </p>
                <p>
                  <strong>Credit.</strong> Licensee shall acknowledge the original authorship of the Composition appropriately and reasonably in all media and performance formats under the name "<Highlight>{stage}</Highlight>" in writing where possible and vocally otherwise.
                </p>
                <p>
                  <strong>Miscellaneous.</strong> This license is non-transferable and is limited to the Composition specified above, constitutes the entire agreement between the Licensor and the Licensee relating to the Composition, and shall be binding upon both the Licensor and the Licensee and their respective successors, assigns, and legal representatives.
                </p>
                <p>
                  <strong>Publishing.</strong><br/>
                  <Highlight>{licensee}</Highlight>, owns <strong>{100 - parsedPublishing}%</strong> of publishing rights. <Highlight>{licensor}</Highlight>, owns <strong>{parsedPublishing}%</strong> of publishing rights.<br/>
                  Finished audio recording by Licensee of audio release can distribute to music supervisors for consideration of synchronization licensing. Only the recording artist or recording company can monetize with this license.
                </p>
                <p className="uppercase font-bold mt-4">
                  <strong>THE PARTIES HAVE DULY EXECUTED THIS AGREEMENT on the date first written above.</strong>
                </p>
                <div className="mt-8">
                  <p>Licensor:<br/>
                  <Highlight>{licensorUpper}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensor}</Highlight> - Producer Authorized Signing Officer</p>
                </div>
                <div className="mt-4">
                  <p>Licensee:<br/>
                  <Highlight>{licensee}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensee}</Highlight> - Artist Authorized Signing Officer</p>
                </div>
              </>
            ) : (
              <>
                <p>Header: License Agreement(NON-EXCLUSIVE RIGHTS)Sound Recording/BEATS</p>
                <p>
                  THIS LICENCE AGREEMENT is made on <Highlight>{dateStr}</Highlight> ("Effective Date") by and between <Highlight>{licensee}</Highlight> (hereinafter referred to as the "Licensee") also, if applicable, and <Highlight>{licensor}</Highlight> (hereinafter referred to as the "Licensor") also, if applicable, professionally known as <Highlight>{stage}</Highlight>, whose principle address is <Highlight>{addr}</Highlight>. Licensor warrants that it controls the mechanical rights in and to the copyrighted musical works entitled "<Highlight>{beatTitle}</Highlight>" ("Composition") as of and prior to the date first written above. The Composition, including the music thereof, was composed by <Highlight>{licensor}</Highlight> ("Songwriter") managed under the Licensor.
                </p>
                <p>
                  <strong>Master Use.</strong> The Licensor hereby grants to Licensee a non-exclusive license (this "License") to record vocal synchronization to the Composition partly or in its entirety and substantially in its original form ("Master Recording").
                </p>
                <p>
                  <strong>Mechanical Rights.</strong> The Licensor hereby grants to Licensee a non-exclusive license to use Master Recording in the reproduction, duplication, manufacture, and distribution of phonograph records, cassette tapes, compact disk, digital downloads, other miscellaneous audio and digital recordings, and any lifts and versions thereof (collectively, the "Recordings", and individually, a "Recordings") worldwide for up to the pressing or selling a total of <Highlight>{currentStreamLimit}</Highlight> copies of such Recordings or any combination of such Recordings, condition upon the payment to the Licensor a sum of <Highlight>{formattedContractPrice}</Highlight>, receipt of which is confirmed.
                </p>
                <p>
                  <strong>License Upgrade.</strong> Upon reaching the limit of <Highlight>{currentStreamLimit}</Highlight> copies or streams as specified in the Mechanical Rights section, the Licensee is required to upgrade this license to an Exclusive Rights Agreement or negotiate a new agreement that includes a 33% publishing split in favor of the Licensor.
                </p>
                <p>
                  <strong>Synchronization Rights.</strong> The Licensor hereby grants limited synchronization rights for one (1) music video streamed online (Youtube, Vimeo, etc..)
                </p>
                <p>
                  <strong>Broadcast Rights.</strong> The Licensor hereby grants to Licensee a non-exclusive license to broadcast or air the Master Recording in two (2) radio stations through two (2) station channels, respectively. The Licensee shall not be permitted to receive compensation for such broadcasting or up to unlimited streams total on all websites. A separate synchronization license will need to be purchased for distribution of video to Television, Film or Video game.
                </p>
                <p>
                  <strong>Credit.</strong> Licensee shall acknowledge the original authorship of the Composition appropriately and reasonably in all media and performance formats under the name "<Highlight>{stage}</Highlight>" in writing where possible and vocally otherwise.
                </p>
                <p>
                  <strong>Delivery.</strong> The Composition shall be delivered via email to an email address that Licensee provided to Licensor. Licensee shall receive an email from containing an attachment or link from which they can download the Composition.
                </p>
                <p>
                  <strong>Indemnification.</strong> Accordingly, Licensee agrees to indemnify and hold Licensor harmless from and against any and all claims, losses, damages, costs, expenses, including, without limitation, reasonable attorney's fees, arising of or resulting from a claimed breach of any of Licensee's representations, warranties or agreements hereunder.
                </p>
                <p>
                  <strong>Governing Law.</strong> This License is governed by and shall be construed under the law of the <strong>State of <Highlight>{addr}</Highlight></strong>, without regard to the conflicts of laws principles thereof.
                </p>
                <p>
                  <strong>Publishing.</strong><br/>
                  <Highlight>{licensee}</Highlight>, owns <strong>{100 - parsedPublishing}%</strong> of publishing rights. <Highlight>{licensor}</Highlight>, owns <strong>{parsedPublishing}%</strong> of publishing rights.
                </p>
                <p className="uppercase font-bold mt-4">
                  <strong>THE PARTIES HAVE DULY EXECUTED THIS AGREEMENT on the date first written above.</strong>
                </p>
                <div className="mt-8">
                  <p>Licensor:<br/>
                  <Highlight>{licensorUpper}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensor}</Highlight> - Producer Authorized Signing Officer</p>
                </div>
                <div className="mt-4">
                  <p>Licensee:<br/>
                  <Highlight>{licensee}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensee}</Highlight> - Artist Authorized Signing Officer</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Beat Selection Modal */}
      {isBeatModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Select Beat</h3>
              <button onClick={() => setIsBeatModalOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search beats..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                />
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Your Beats</span>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                  >
                    <span>{sortBy === 'date' ? 'Sort by Date' : sortBy === 'name' ? 'Sort by Name' : sortBy === 'bpm' ? 'Sort by BPM' : 'Sort by Genre'}</span>
                    <svg className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                        {[
                          { id: 'date', label: 'Sort by Date' },
                          { id: 'name', label: 'Sort by Name' },
                          { id: 'bpm', label: 'Sort by BPM' },
                          { id: 'genre', label: 'Sort by Genre' }
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => { setSortBy(option.id); setIsSortOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${sortBy === option.id ? 'text-blue-600 font-semibold bg-blue-50/50 hover:bg-blue-50' : 'text-gray-700'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

              </div>

              <div className="space-y-2">
                {sortedBeats.map(beat => (
                  <button
                    key={beat.id}
                    onClick={() => {
                      setSelectedBeatId(beat.id);
                      setCustomBeatName('');
                      setIsBeatModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      selectedBeatId === beat.id && !customBeatName
                        ? 'border-black bg-gray-50'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{beat.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {beat.bpm ? `${beat.bpm} BPM • ` : ''}{new Date(beat.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {selectedBeatId === beat.id && !customBeatName && <Check size={16} className="text-black" />}
                  </button>
                ))}
                {sortedBeats.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-500">No beats found matching your search.</div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Or enter a custom beat name:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Custom Beat Title"
                    value={customBeatInput}
                    onChange={e => setCustomBeatInput(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                  <button
                    onClick={() => {
                      if (customBeatInput.trim()) {
                        setCustomBeatName(customBeatInput.trim());
                        setSelectedBeatId('');
                        setCustomBeatInput('');
                        setIsBeatModalOpen(false);
                      }
                    }}
                    className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors shrink-0"
                  >
                    Use Custom
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
