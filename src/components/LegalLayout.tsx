import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Shield, FileText, Cookie } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  activeTab: 'terms' | 'privacy' | 'cookies';
  children: React.ReactNode;
}

export default function LegalLayout({
  title,
  subtitle,
  lastUpdated = 'October 10, 2026',
  activeTab,
  children,
}: LegalLayoutProps) {
  const getBadge = () => {
    switch (activeTab) {
      case 'terms':
        return {
          icon: <FileText size={14} className="text-gray-700" aria-hidden="true" />,
          label: 'Terms of Service',
        };
      case 'privacy':
        return {
          icon: <Shield size={14} className="text-gray-700" aria-hidden="true" />,
          label: 'Privacy Policy',
        };
      case 'cookies':
        return {
          icon: <Cookie size={14} className="text-gray-700" aria-hidden="true" />,
          label: 'Cookie Policy',
        };
    }
  };

  const badge = getBadge();

  return (
    <div className="w-full bg-white text-gray-900 min-h-full print:min-h-0 flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-6 lg:px-12 py-4 print:static print:border-b-0 print:py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-xs group-hover:opacity-90 transition-opacity">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">BeatHelper</span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              Legal Center
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav aria-label="Legal document navigation" className="hidden md:flex print:hidden items-center space-x-1 text-sm font-medium">
            <Link
              href="/terms"
              aria-current={activeTab === 'terms' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'terms'
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
              }`}
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              aria-current={activeTab === 'privacy' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
              }`}
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              aria-current={activeTab === 'cookies' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'cookies'
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
              }`}
            >
              Cookie Policy
            </Link>
          </nav>

          <div className="flex items-center space-x-3 print:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <nav aria-label="Mobile legal tabs" className="md:hidden print:hidden flex items-center justify-center space-x-2 pt-3 border-t border-gray-100 mt-3 text-xs">
          <Link
            href="/terms"
            aria-current={activeTab === 'terms' ? 'page' : undefined}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'terms' ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600'
            }`}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            aria-current={activeTab === 'privacy' ? 'page' : undefined}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'privacy' ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600'
            }`}
          >
            Privacy
          </Link>
          <Link
            href="/cookies"
            aria-current={activeTab === 'cookies' ? 'page' : undefined}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'cookies' ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600'
            }`}
          >
            Cookies
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-10 sm:py-14">
        {/* Document Header */}
        <div className="mb-10 pb-8 border-b border-gray-200">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 mb-4">
            {badge.icon}
            <span>{badge.label}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4">
            {subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Effective: {lastUpdated}</span>
            <span>•</span>
            <span>BeatHelper Inc.</span>
          </div>
        </div>

        {/* Document Body */}
        <article className="space-y-10 text-gray-700 leading-relaxed">
          {children}
        </article>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-gray-50/80 py-10 px-6 lg:px-12 w-full print:bg-white print:py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            &copy; 2026 BeatHelper Inc. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/terms" className="hover:text-black transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="hover:text-black transition-colors">
              Cookie Policy
            </Link>
            <Link href="/" className="hover:text-black transition-colors">
              BeatHelper Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
