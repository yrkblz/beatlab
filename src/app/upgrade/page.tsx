'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Zap, 
  Loader2, 
  ArrowLeft,
  Infinity as InfinityIcon,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription';

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          const status = calculateSubscriptionStatus(profile, user.created_at);
          setSubStatus(status);
        }
      } catch (err) {
        console.error('Error loading subscription info:', err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleCheckout() {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Nie udało się zainicjować płatności Stripe.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Wystąpił błąd połączenia z bramką płatności.');
      setLoading(false);
    }
  }

  const features = [
    'Nieograniczony dostęp do wszystkich 9 modułów BEATLAB',
    'Placement CRM – zarządzanie relacjami z artystami i A&R',
    'Generator umów licencyjnych (MP3, WAV, Trackout, Exclusive)',
    'Katalog bitów z playerem i natychmiastowym eksportem',
    'Social Auto-Publisher dla TikToka i Instagrama',
    'Lead Finder & Mail Tracker z pikselem śledzącym',
    'Wielowalutowy kalkulator finansowy i przychodów',
    'Brak comiesięcznych subskrypcji – płacisz tylko raz',
    'Wszystkie przyszłe aktualizacje i nowe narzędzia w cenie',
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Back Link */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Wróć do BEATLAB
          </Link>

          {subStatus?.isTrialActive && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              <Clock size={13} />
              <span>
                3-dniowe Demo: pozostało {subStatus.daysRemaining} {subStatus.daysRemaining === 1 ? 'dzień' : 'dni'}
              </span>
            </div>
          )}

          {subStatus?.isTrialExpired && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
              <Clock size={13} />
              <span>Okres próbny wygasł – wybierz dożywotni dostęp</span>
            </div>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black text-white text-xs font-semibold tracking-wide uppercase mb-4 shadow-sm">
            <Sparkles size={13} className="text-amber-400" />
            <span>Lifetime Deal • Jednorazowa Płatność</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mb-4 leading-tight">
            Płacisz raz. Korzystasz bez limitu przez całe życie.
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Żadnych powtarzających się subskrypcji. Pełny ekosystem profesjonalnych narzędzi dla producentów muzycznych w cenie jednej kolacji.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-lg mx-auto bg-white border-2 border-black rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Top highlight ribbon */}
          <div className="absolute top-0 right-0 bg-black text-white text-[11px] font-bold px-4 py-1 rounded-bl-xl tracking-wider uppercase">
            Pełny Dostęp
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
              <InfinityIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">BEATLAB Lifetime Access</h2>
              <p className="text-xs text-gray-500">Wszystkie moduły i przyszłe funkcje</p>
            </div>
          </div>

          {/* Price display */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl sm:text-6xl font-black tracking-tight text-gray-900">$29</span>
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">USD / jednorazowo</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mb-8 flex items-center gap-1.5">
            <Zap size={14} />
            Płatność jednorazowa • Dożywotni dostęp • 0 zł miesięcznie
          </p>

          {/* Checkout CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={loading || initialLoading || subStatus?.isLifetime}
            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-bold rounded-2xl py-4 px-6 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all text-base cursor-pointer disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Łączenie z bezpieczną kasą Stripe...</span>
              </>
            ) : subStatus?.isLifetime ? (
              <>
                <Check size={20} className="text-emerald-400" />
                <span>Posiadasz już dożywotni dostęp!</span>
              </>
            ) : (
              <>
                <span>Kup Dożywotni Dostęp ($29)</span>
              </>
            )}
          </button>

          {/* Payment Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pb-6 border-b border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CreditCard size={13} /> Karta (Visa, MC)
            </span>
            <span>•</span>
            <span>Apple Pay</span>
            <span>•</span>
            <span>Google Pay</span>
            <span>•</span>
            <span>PayPal</span>
          </div>

          {/* Features Checklist */}
          <div className="mt-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Co otrzymujesz w pakiecie:</p>
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={11} strokeWidth={3} />
                </div>
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Security guarantee */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Bezpieczne szyfrowane płatności obsługiwane przez Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
