'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2, LogOut, Check, ChevronDown } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
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
  }, [router]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setStageName(data.stage_name || '');
        setAddress(data.address || '');
        setBaseCurrency(data.base_currency || 'USD');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setInitialLoading(false);
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Account & Settings</h1>
            <p className="text-gray-500">Manage your producer profile and account details.</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loadingAuth}
            className="bg-red-50 text-red-600 font-semibold rounded-xl px-4 py-2 flex items-center hover:bg-red-100 transition-all disabled:opacity-50 text-sm"
          >
            {loadingAuth ? <Loader2 className="animate-spin" size={16} /> : <><LogOut size={16} className="mr-2" /> Log out</>}
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="pb-6 border-b border-gray-100 mb-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white font-semibold text-lg shadow-inner">
              {user.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.email}</p>
              <p className="text-sm text-gray-500">Logged in via Google</p>
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
        </form>

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
          className="w-full bg-white border border-gray-200 text-gray-900 font-semibold rounded-2xl py-4 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
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
