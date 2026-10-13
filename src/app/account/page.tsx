'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, 
  Loader2, 
  LogOut, 
  Check, 
  ChevronDown, 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  User as UserIcon 
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { calculateSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription';
import TrialExpiredModal from '@/components/TrialExpiredModal';

const CURRENCIES = ['USD', 'PLN', 'EUR', 'RUB', 'UAH'];

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
        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm flex justify-between items-center cursor-pointer hover:border-gray-300 transition-colors"
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
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer flex justify-between items-center transition-colors"
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

export default function AccountPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Settings State
  const [fullName, setFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [address, setAddress] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active Tab State (defaults to 'profile', switchable to 'billing')
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');

  // Trial Timer & Expired Modal State
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  // Sync activeTab from URL search query (?tab=profile or ?tab=billing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'profile') {
        setActiveTab('profile');
      } else if (tabParam === 'billing') {
        setActiveTab('billing');
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id, user);
      } else {
        setInitialLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, currentUser?: User | null) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setStageName(data.stage_name || '');
        setAddress(data.address || '');
        setBaseCurrency(data.base_currency || 'USD');
        const calculated = calculateSubscriptionStatus(
          {
            is_lifetime_paid: data.is_lifetime_paid,
            trial_ends_at: data.trial_ends_at,
            created_at: data.created_at,
          },
          currentUser?.created_at
        );
        setSubStatus(calculated);
        if (calculated.isTrialExpired) {
          setShowExpiredModal(true);
        }

        // If user profile details are incomplete and user did not explicitly request billing tab, open profile tab
        if (!data.full_name || !data.stage_name || !data.address || !data.base_currency) {
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (!params.get('tab')) {
              setActiveTab('profile');
            }
          }
        }
      } else {
        // Brand new user without a profile in DB yet!
        // Start 3-day trial from now
        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const calculated = calculateSubscriptionStatus(
          { trial_ends_at: trialEndDate },
          currentUser?.created_at || new Date().toISOString()
        );
        setSubStatus(calculated);

        const defaultName =
          currentUser?.user_metadata?.full_name ||
          currentUser?.user_metadata?.name ||
          '';
        if (defaultName) {
          setFullName(defaultName);
        }

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (!params.get('tab')) {
            setActiveTab('profile');
          }
        }

        // Auto-create initial profile row with trial_ends_at
        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: defaultName,
            stage_name: defaultName,
            address: '',
            base_currency: 'USD',
            trial_ends_at: trialEndDate,
          });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const calculated = calculateSubscriptionStatus(
        null,
        currentUser?.created_at || new Date().toISOString()
      );
      setSubStatus(calculated);
    } finally {
      setInitialLoading(false);
    }
  };

  // Live countdown timer ticking every second
  useEffect(() => {
    if (!subStatus || subStatus.isLifetime) return;

    const updateTimer = () => {
      if (!subStatus.trialEndsAt) return;
      const targetTime = new Date(subStatus.trialEndsAt).getTime();
      const diff = targetTime - Date.now();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (subStatus.isTrialActive) {
          setSubStatus((prev) =>
            prev
              ? {
                  ...prev,
                  isTrialActive: false,
                  isTrialExpired: true,
                  hasAccess: false,
                  daysRemaining: 0,
                  hoursRemaining: 0,
                }
              : null
          );
          setShowExpiredModal(true);
        }
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeRemaining({ days, hours, minutes, seconds, isExpired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [subStatus?.trialEndsAt, subStatus?.isLifetime, subStatus?.isTrialActive]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          stage_name: stageName,
          address,
          base_currency: baseCurrency,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        alert('Error saving profile: ' + error.message);
      } else {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
        }, 3000);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  async function handleGoogleLogin() {
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });

    if (error) {
      console.error(error);
      alert('Error logging in with Google. Please try again.');
      setLoadingAuth(false);
    }
  }

  async function handleLogout() {
    setLoadingAuth(true);
    await supabase.auth.signOut();
    setLoadingAuth(false);
    router.push('/');
  }

  if (initialLoading) {
    return (
      <div className="-m-8 min-h-[calc(100%+4rem)] flex items-center justify-center bg-[#fbfbfd]">
        <Loader2 className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Account & Settings</h1>
            <p className="text-gray-500">Manage your producer profile, subscription, and studio preferences.</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loadingAuth}
            className="bg-red-50 text-red-600 font-semibold rounded-xl px-4 py-2 flex items-center hover:bg-red-100 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {loadingAuth ? <Loader2 className="animate-spin" size={16} /> : <><LogOut size={16} className="mr-2" /> Log out</>}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6 space-x-1" role="tablist" aria-label="Account Tabs">
          <button
            type="button"
            role="tab"
            id="tab-profile"
            data-testid="tab-profile"
            aria-selected={activeTab === 'profile'}
            aria-controls="panel-profile"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <UserIcon size={16} />
            <span>Profile & Studio</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-billing"
            data-testid="tab-billing"
            aria-selected={activeTab === 'billing'}
            aria-controls="panel-billing"
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'billing'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <CreditCard size={16} />
            <span>Plan & Billing</span>
            {subStatus?.isLifetime ? (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Lifetime
              </span>
            ) : subStatus?.isTrialActive ? (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Trial Active
              </span>
            ) : subStatus?.isTrialExpired ? (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Expired
              </span>
            ) : null}
          </button>
        </div>

        {/* Dedicated Billing & Subscription Section */}
        {activeTab === 'billing' && (
          <div
            id="panel-billing"
            role="tabpanel"
            aria-labelledby="tab-billing"
            data-testid="panel-billing"
            className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-800 shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Plan & Billing</h2>
                  <p className="text-xs text-gray-500">Overview of your current studio plan, trial timer, and lifetime access.</p>
                </div>
              </div>

              {subStatus?.isLifetime ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Lifetime Member
                </span>
              ) : subStatus?.isTrialExpired ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  <AlertTriangle size={13} className="text-rose-600" />
                  Trial Expired
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  <Clock size={13} className="text-blue-600 animate-pulse" />
                  3-Day Free Trial
                </span>
              )}
            </div>

            {/* Plan Details Body */}
            {subStatus?.isLifetime ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-emerald-900 text-sm mb-1">BEATLAB Lifetime Access Pass</h3>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        You hold an active lifetime license. All 9 producer modules, beat catalog features, and future platform tools are fully unlocked with zero recurring subscription charges.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 ml-3">
                      $29 Paid
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 pt-1">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Billing Interval</span>
                    <span className="font-semibold text-gray-800">One-Time (No Renewals)</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Module Coverage</span>
                    <span className="font-semibold text-gray-800">9 of 9 Modules Active</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Software Updates</span>
                    <span className="font-semibold text-gray-800">Included for Life</span>
                  </div>
                </div>
              </div>
            ) : subStatus?.isTrialExpired ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 text-rose-900 text-xs leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 text-sm">
                    <AlertTriangle size={15} />
                    <span>Your 3-Day Free Trial Has Ended</span>
                  </div>
                  <p className="text-rose-700">
                    Access to BEATLAB modules has expired. Upgrade now to unlock lifetime access across your entire producer workflow.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpiredModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    View Lifetime Offer
                  </button>

                  <Link
                    href="/upgrade"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Get Lifetime Access for $29</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[#fbfbfd] border border-gray-200/90 text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Time Remaining in 3-Day Demo
                  </p>

                  {/* Countdown Timer */}
                  <div
                    data-testid="trial-countdown-timer"
                    className="flex items-center justify-center gap-2 sm:gap-3 text-gray-900"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-black bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs min-w-[54px]">
                        {String(timeRemaining.days).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase mt-1">Days</span>
                    </div>
                    <span className="text-xl font-bold text-gray-300 pb-4">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-black bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs min-w-[54px]">
                        {String(timeRemaining.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase mt-1">Hours</span>
                    </div>
                    <span className="text-xl font-bold text-gray-300 pb-4">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-black bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs min-w-[54px]">
                        {String(timeRemaining.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase mt-1">Minutes</span>
                    </div>
                    <span className="text-xl font-bold text-gray-300 pb-4">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-black bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs min-w-[54px] text-blue-600">
                        {String(timeRemaining.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase mt-1">Seconds</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-4 leading-relaxed max-w-md mx-auto">
                    Your free 3-day preview is currently active. Upgrade to Lifetime Access anytime before expiration to guarantee seamless access to all studio tools.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="text-xs text-gray-500 text-center sm:text-left">
                    <span className="font-semibold text-gray-900 block">Lifetime Deal: $29 USD</span>
                    <span>One-time purchase • Zero recurring subscriptions</span>
                  </div>

                  <Link
                    href="/upgrade"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Get Lifetime Access ($29)</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <p>Looking to edit your producer name or stage details?</p>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="font-semibold text-black hover:underline cursor-pointer"
              >
                Switch to Profile Settings &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Profile Settings Form */}
        {activeTab === 'profile' && (
          <form
            id="panel-profile"
            role="tabpanel"
            aria-labelledby="tab-profile"
            data-testid="panel-profile"
            onSubmit={handleSave}
            className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6"
          >
            <div className="pb-6 border-b border-gray-100 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white font-semibold text-lg shadow-inner shrink-0">
                  {user.email?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Google Account</span>
                    {subStatus && (
                      subStatus.isLifetime ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Lifetime Member
                        </span>
                      ) : subStatus.isTrialActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          Trial ({subStatus.daysRemaining} {subStatus.daysRemaining === 1 ? 'day' : 'days'} left)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Trial Expired
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Legal Name *</label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#fbfbfd] border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stage Name (Producer Name) *</label>
              <input 
                type="text" 
                required
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                className="w-full bg-[#fbfbfd] border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
                placeholder="e.g. Metro Boomin"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address *</label>
              <textarea 
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#fbfbfd] border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
                placeholder="e.g. 123 Music Lane, Los Angeles, CA 90001"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Base Currency *</label>
              <CustomSelect options={CURRENCIES} value={baseCurrency} onChange={setBaseCurrency} />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={saving || savedSuccess}
                className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 flex justify-center items-center gap-2 ${savedSuccess ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-black text-white hover:bg-gray-800 hover:shadow-lg disabled:opacity-50'}`}
              >
                {saving ? 'Saving...' : savedSuccess ? <><Check size={18} /> Saved successfully!</> : 'Save Settings'}
              </button>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <p>Want to check your trial timer or billing details?</p>
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="font-semibold text-black hover:underline cursor-pointer"
              >
                Switch to Plan & Billing &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Legal Links Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-black transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-black transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/cookies" className="hover:text-black transition-colors">
            Cookie Policy
          </Link>
        </div>

        {/* Modal Prompt When Trial Ends */}
        <TrialExpiredModal
          isOpen={showExpiredModal}
          onClose={() => setShowExpiredModal(false)}
          userId={user?.id}
          userEmail={user?.email}
        />
      </div>
    );
  }

  return (
    <div className="-m-8 min-h-[calc(100%+4rem)] flex items-center justify-center bg-[#fbfbfd] px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-10 shadow-xl text-center">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-md">
          <Sparkles size={32} />
        </div>
        
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Welcome to BEATLAB
        </h2>
        <p className="text-gray-500 mb-10">
          Sign in to manage your catalog, track finances, and send massive email campaigns.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loadingAuth}
          className="w-full bg-white border border-gray-200 text-gray-900 font-semibold rounded-2xl py-4 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loadingAuth ? (
            <Loader2 className="animate-spin text-gray-500" size={24} />
          ) : (
            <>
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 mt-8">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-gray-600 transition-colors">
            Terms of Service
          </Link>
          ,{' '}
          <Link href="/privacy" className="underline hover:text-gray-600 transition-colors">
            Privacy Policy
          </Link>
          , and{' '}
          <Link href="/cookies" className="underline hover:text-gray-600 transition-colors">
            Cookie Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}
