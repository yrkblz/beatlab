'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'beathelper_cookie_consent';

function checkStoredConsent(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const consent = window.localStorage.getItem(STORAGE_KEY);
      if (consent === 'accepted' || consent === '"accepted"') return true;
    }
  } catch {
    // localStorage restricted / SecurityError in strict private mode
  }

  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const eqIdx = c.indexOf('=');
        if (eqIdx === -1) continue;
        const name = c.slice(0, eqIdx).trim();
        const rawVal = c.slice(eqIdx + 1).trim();
        const val = rawVal.replace(/^["']|["']$/g, '');
        if (name === STORAGE_KEY && val === 'accepted') {
          return true;
        }
      }
    }
  } catch {
    // Cookie access restricted
  }

  return false;
}

function persistConsent(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
    }
  } catch {
    // localStorage restricted / quota exceeded
  }

  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${STORAGE_KEY}=accepted; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch {
    // Cookie write restricted
  }
}

export default function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!checkStoredConsent()) {
      setVisible(true);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'accepted' || e.newValue === '"accepted"')) {
        setVisible(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleAccept = () => {
    persistConsent();
    setVisible(false);
  };

  if (!mounted || !visible) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none flex justify-center print:hidden"
    >
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 sm:p-6 pointer-events-auto flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shrink-0 mt-0.5">
            <Cookie size={18} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Cookie Preferences &amp; Compliance
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              BeatHelper uses cookies and local storage to provide secure authentication, maintain your session, and analyze platform usage. By clicking &ldquo;Accept&rdquo;, you agree to our use of cookies in accordance with our{' '}
              <Link href="/cookies" className="font-medium text-gray-900 underline hover:text-black">
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium text-gray-900 underline hover:text-black">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleAccept}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-black hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded-xl transition-colors shadow-sm cursor-pointer text-center"
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
