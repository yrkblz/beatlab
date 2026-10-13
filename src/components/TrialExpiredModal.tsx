'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Lock, Sparkles, Check, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

export default function TrialExpiredModal({
  isOpen,
  onClose,
  userId,
  userEmail,
}: TrialExpiredModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleProceed() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || '',
          userEmail: userEmail || '',
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push('/upgrade');
      }
    } catch (err) {
      console.error('Checkout redirect error:', err);
      router.push('/upgrade');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-expired-title"
      data-testid="trial-expired-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative max-w-lg w-full bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Top Icon */}
        <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
          <Lock size={28} className="text-amber-400" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>3-Day Free Trial Ended</span>
        </div>

        {/* Heading */}
        <h2
          id="trial-expired-title"
          className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 mb-2 leading-tight"
        >
          Get Lifetime Access Forever
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-sm mx-auto">
          Your 3-day free demo has concluded. Unlock permanent, unrestricted access to the entire BEATLAB studio suite for a single one-time payment.
        </p>

        {/* Pricing Box */}
        <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between items-baseline border-b border-gray-200/70 pb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                BEATLAB Lifetime Pass
              </p>
              <p className="text-xs text-gray-400">All 9 current modules &amp; future tools</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-gray-900">$29</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase ml-1">USD</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-600 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check size={11} strokeWidth={3} />
              </div>
              <span>Pay once – zero recurring monthly or annual fees</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check size={11} strokeWidth={3} />
              </div>
              <span>Unlimited license generation, catalog management &amp; CRM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check size={11} strokeWidth={3} />
              </div>
              <span>Continuous updates, new producer utilities &amp; cloud sync</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleProceed}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold rounded-2xl py-3.5 px-6 transition-all shadow-md text-sm cursor-pointer mb-3"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Redirecting to Checkout...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="text-amber-400" />
              <span>Get Lifetime Access for $29</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Secondary Links */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <Link
            href="/upgrade"
            onClick={onClose}
            className="hover:text-black underline font-medium transition-colors"
          >
            View plan details
          </Link>
          <span>•</span>
          <button
            onClick={onClose}
            className="hover:text-black font-medium transition-colors cursor-pointer"
          >
            Review settings
          </button>
        </div>

        {/* Trust Badge */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Encrypted Stripe Checkout • Instant Account Activation</span>
        </div>
      </div>
    </div>
  );
}
