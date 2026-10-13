'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

interface PaywallBlockerProps {
  toolName?: string;
}

export default function PaywallBlocker({ toolName = 'ten moduł' }: PaywallBlockerProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200/90 rounded-3xl p-8 sm:p-10 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-6 shadow-md shadow-black/10">
          <Lock size={28} className="text-amber-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-3">
          <Zap size={13} />
          <span>3-Dniowe Demo Wygasło</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
          Odblokuj dostęp dożywotni
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Twój 3-dniowy okres darmowego demo dobiegł końca. Aby korzystać z modułu <strong className="text-gray-900">{toolName}</strong> oraz całej platformy BEATLAB, wykup licencję Lifetime.
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-left text-xs space-y-1.5">
          <div className="flex justify-between items-baseline font-bold text-gray-900 text-sm pb-1 border-b border-gray-200/60">
            <span>BEATLAB Lifetime Deal</span>
            <span className="text-base font-extrabold">$29 USD</span>
          </div>
          <p className="text-gray-600 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Płacisz tylko raz – brak abonamentu</span>
          </p>
          <p className="text-gray-600 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>Karta, Apple Pay, Google Pay i PayPal</span>
          </p>
        </div>

        <Link
          href="/upgrade"
          className="w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-bold rounded-2xl py-3.5 px-6 transition-all shadow-md text-sm"
        >
          <span>Kup Dożywotni Dostęp ($29)</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
