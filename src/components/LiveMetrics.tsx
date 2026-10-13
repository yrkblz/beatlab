'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, ShieldCheck, FileCheck, Zap, Activity } from 'lucide-react';
import TiltCard from './TiltCard';

interface MetricItemProps {
  label: string;
  sublabel: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  badge: string;
  icon: React.ReactNode;
}

import CasinoSlotCounter from './CasinoSlotCounter';

export function AnimatedCounter({
  target,
  prefix = '',
  suffix = '',
  decimals = 0,
  trigger,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  trigger?: boolean;
}) {
  return (
    <CasinoSlotCounter
      target={target}
      prefix={prefix}
      suffix={suffix}
      decimals={decimals}
      trigger={trigger}
    />
  );
}

export default function LiveMetrics({ className = '' }: { className?: string }) {
  const [hasScrolledIntoView, setHasScrolledIntoView] = useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      setHasScrolledIntoView(true);
      return;
    }

    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolledIntoView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);
  const METRICS: MetricItemProps[] = [
    {
      label: 'Net Beat Sales Tracked',
      sublabel: 'Multi-currency ledger across USD, EUR & PLN',
      value: 4.8,
      prefix: '$',
      suffix: 'M+',
      decimals: 1,
      badge: '+32.4% MoM',
      icon: <TrendingUp size={20} className="text-emerald-600" aria-hidden="true" />,
    },
    {
      label: 'Producer Contracts Signed',
      sublabel: 'MP3, WAV, Trackouts & Exclusive agreements',
      value: 142000,
      suffix: '+',
      decimals: 0,
      badge: '100% Legally Binding',
      icon: <FileCheck size={20} className="text-purple-600" aria-hidden="true" />,
    },
    {
      label: 'Artist Outreach Deliverability',
      sublabel: 'Verified A&R mailboxes with tracking pixels',
      value: 99.4,
      suffix: '%',
      decimals: 1,
      badge: 'Zero Domain Flags',
      icon: <ShieldCheck size={20} className="text-blue-600" aria-hidden="true" />,
    },
    {
      label: 'Average Contract Setup',
      sublabel: 'From artist negotiation to instant PDF export',
      value: 28,
      prefix: '< ',
      suffix: 's',
      decimals: 0,
      badge: 'Instant One-Click',
      icon: <Zap size={20} className="text-amber-600" aria-hidden="true" />,
    },
  ];

  return (
    <div
      ref={sectionRef}
      data-testid="live-metrics-showcase"
      className={`w-full max-w-7xl mx-auto ${className}`}
    >
      {/* Live System Beacon Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 mb-8 border-b border-gray-200">
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Trusted by Modern Independent Producers
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Real-time studio activity metrics powering beatmakers in over 45 countries.
          </p>
        </div>

        {/* Live Cloud Sync Beacon Indicator */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-2xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-emerald-800">
            Live Cloud Sync Active • 99.98% Uptime
          </span>
          <Activity size={14} className="text-emerald-600" aria-hidden="true" />
        </div>
      </div>

      {/* 4 Interactive Metric Tilt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRICS.map((metric) => (
          <TiltCard
            key={metric.label}
            maxTilt={6}
            scale={1.02}
            className="h-full"
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col justify-between shadow-xs hover:border-black/30 hover:shadow-md transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {metric.icon}
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    {metric.badge}
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                  <AnimatedCounter
                    target={metric.value}
                    prefix={metric.prefix}
                    suffix={metric.suffix}
                    decimals={metric.decimals}
                    trigger={hasScrolledIntoView}
                  />
                </div>

                <h4 className="text-sm font-bold text-gray-800 mb-1">
                  {metric.label}
                </h4>
              </div>

              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                {metric.sublabel}
              </p>
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}
