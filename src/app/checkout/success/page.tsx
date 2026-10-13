'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [updating, setUpdating] = useState(true);
  const isMock = searchParams.get('mock') === 'true';
  const userId = searchParams.get('user_id');

  useEffect(() => {
    async function activate() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetId = userId || user?.id;

        if (targetId) {
          // Ensure profile is marked as lifetime
          await supabase
            .from('profiles')
            .update({
              is_lifetime_paid: true,
              paid_at: new Date().toISOString(),
            })
            .eq('id', targetId);
        }
      } catch (err) {
        console.error('Error activating lifetime plan:', err);
      } finally {
        setUpdating(false);
      }
    }

    activate();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200/80 rounded-3xl p-8 sm:p-10 shadow-xl text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-md shadow-black/10">
          <CheckCircle2 size={36} className="text-emerald-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3">
          <ShieldCheck size={14} />
          <span>Lifetime Access Activated</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
          Welcome to the BEATLAB Club!
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Your one-time $29 payment has been processed successfully. You have unlocked unlimited lifetime access to all studio tools.
        </p>

        {isMock && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 text-left">
            💡 <strong>Test Mode:</strong> Lifetime access has been successfully activated on your Supabase account.
          </div>
        )}

        <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 text-left text-xs text-gray-600 mb-8 space-y-2">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Sparkles size={14} className="text-amber-500" />
            <span>What is unlocked for you:</span>
          </div>
          <p className="flex items-center gap-1.5">✓ Zero recurring subscriptions</p>
          <p className="flex items-center gap-1.5">✓ Unlimited license agreement generation</p>
          <p className="flex items-center gap-1.5">✓ Full Placement CRM &amp; Lead Finder</p>
          <p className="flex items-center gap-1.5">✓ Social Auto-Publisher and financial analytics</p>
        </div>

        <Link
          href="/"
          className="w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold rounded-2xl py-3.5 transition-all shadow-md shadow-black/10 text-sm"
        >
          {updating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Setting up your account...</span>
            </>
          ) : (
            <>
              <span>Go to Studio Dashboard</span>
              <ArrowRight size={16} />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
