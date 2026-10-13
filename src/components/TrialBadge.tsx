'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { SubscriptionStatus } from '@/lib/subscription';

interface TrialBadgeProps {
  status: SubscriptionStatus | null;
  isLoggedIn: boolean;
}

export default function TrialBadge({ status, isLoggedIn }: TrialBadgeProps) {
  if (!isLoggedIn || !status) return null;

  if (status.isLifetime) {
    return (
      <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2 text-xs font-semibold text-emerald-800 shadow-xs">
        <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
        <span className="truncate">Lifetime Member</span>
      </div>
    );
  }

  if (status.isTrialActive) {
    return (
      <div className="mx-4 mb-3 p-3 rounded-2xl bg-white border border-gray-200/80 shadow-xs text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            <Clock size={12} />
            Free Trial
          </span>
          <span className="text-[11px] font-medium text-gray-500">
            {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mb-2 leading-tight">
          3-day free trial period.
        </p>
        <Link
          href="/upgrade"
          className="w-full inline-flex items-center justify-center gap-1.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl py-1.5 text-[11px] transition-colors shadow-xs"
        >
          <Sparkles size={11} className="text-amber-400" />
          <span>Get Lifetime Access $29</span>
        </Link>
      </div>
    );
  }

  if (status.isTrialExpired) {
    return (
      <div className="mx-4 mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 shadow-xs text-xs">
        <div className="flex items-center gap-1.5 text-red-700 font-bold mb-1 text-[11px]">
          <AlertTriangle size={13} />
          <span>Trial Expired</span>
        </div>
        <p className="text-[11px] text-red-600/90 mb-2 leading-tight">
          Unlock lifetime access ($29) to keep using studio tools.
        </p>
        <Link
          href="/upgrade"
          className="w-full inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-1.5 text-[11px] transition-colors shadow-xs"
        >
          <Sparkles size={11} />
          <span>Unlock for $29</span>
        </Link>
      </div>
    );
  }

  return null;
}
