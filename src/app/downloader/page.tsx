'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Video,
  Loader2,
  Link2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionStatus } from '@/lib/subscription';
import type { User } from '@supabase/supabase-js';

const TRIAL_MAX_DOWNLOADS = 5;

export default function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ title: string; link: string } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isLifetime, setIsLifetime] = useState(false);
  const [downloadsCount, setDownloadsCount] = useState(0);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSubscriptionAndLimits() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_lifetime_paid, trial_ends_at, created_at')
            .eq('id', currentUser.id)
            .single();

          if (!isMounted) return;

          const subStatus = calculateSubscriptionStatus(
            profile,
            currentUser.created_at
          );
          setIsLifetime(subStatus.isLifetime);

          // Retrieve download count from localStorage and user metadata
          const storageKey = `beatlab_mp3_downloads_${currentUser.id}`;
          const localVal = parseInt(
            localStorage.getItem(storageKey) || '0',
            10
          );
          const metaVal = parseInt(
            currentUser.user_metadata?.mp3_downloads_count || '0',
            10
          );
          const highestCount = Math.max(
            isNaN(localVal) ? 0 : localVal,
            isNaN(metaVal) ? 0 : metaVal
          );
          setDownloadsCount(highestCount);
        } else {
          const localVal = parseInt(
            localStorage.getItem('beatlab_mp3_downloads_guest') || '0',
            10
          );
          setDownloadsCount(isNaN(localVal) ? 0 : localVal);
        }
      } catch (err) {
        console.error('Error verifying downloader subscription:', err);
      } finally {
        if (isMounted) setAuthChecking(false);
      }
    }

    checkSubscriptionAndLimits();

    return () => {
      isMounted = false;
    };
  }, []);

  const isTrial = !isLifetime;
  const isLimitReached = isTrial && downloadsCount >= TRIAL_MAX_DOWNLOADS;
  const remainingDownloads = Math.max(0, TRIAL_MAX_DOWNLOADS - downloadsCount);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    if (isLimitReached) {
      setError(
        'Trial limit reached (5/5 downloads used). Upgrade to Lifetime Access ($29) for unlimited MP3 downloads.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/download-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to download');
      }

      setResult({ title: data.title, link: data.link });

      // Track and increment download count if in trial
      if (isTrial) {
        const nextCount = downloadsCount + 1;
        setDownloadsCount(nextCount);

        if (user) {
          const storageKey = `beatlab_mp3_downloads_${user.id}`;
          localStorage.setItem(storageKey, nextCount.toString());
          supabase.auth
            .updateUser({
              data: { mp3_downloads_count: nextCount },
            })
            .catch(() => {});
        } else {
          localStorage.setItem(
            'beatlab_mp3_downloads_guest',
            nextCount.toString()
          );
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
              <Video size={32} className="text-red-600 mr-3" />
              YouTube MP3 Downloader
            </h2>
            <p className="text-gray-500 mt-2">
              Convert and download YouTube videos to high-quality MP3 directly to your computer.
            </p>
          </div>

          {/* Subscription & Download Status Badge */}
          {!authChecking && (
            <div>
              {isLifetime ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 shadow-sm">
                  <Sparkles size={14} className="text-emerald-600" />
                  <span>Lifetime Plan • Unlimited MP3 Downloads</span>
                </div>
              ) : (
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
                    isLimitReached
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLimitReached ? 'bg-red-600' : 'bg-amber-500'
                    }`}
                  ></span>
                  <span>
                    Trial Downloads:{' '}
                    <strong>
                      {downloadsCount} / {TRIAL_MAX_DOWNLOADS}
                    </strong>{' '}
                    used ({remainingDownloads} remaining)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trial Limit Reached Banner */}
      {isLimitReached && (
        <div className="bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 border-2 border-red-200/90 rounded-2xl p-6 sm:p-7 shadow-md mb-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/20">
                <Lock size={26} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wide mb-1">
                  Trial Limit Reached
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">
                  5 of 5 Free Downloads Used
                </h3>
                <p className="text-sm text-gray-600 mt-1.5 max-w-xl leading-relaxed">
                  You have reached the maximum of <strong>5 MP3 downloads</strong> allowed in the free demo trial. Unlock <strong>Unlimited MP3 Downloads</strong> forever with Lifetime Access ($29) — one payment, zero recurring fees.
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-medium justify-center sm:justify-start">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <ShieldCheck size={14} /> Unlimited Downloads
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <ShieldCheck size={14} /> Full BEATLAB Studio Suite
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/upgrade"
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm w-full sm:w-auto"
            >
              <Sparkles size={16} />
              <span>Unlock Unlimited ($29)</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Converter Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <form onSubmit={handleDownload} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Link2
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading || isLimitReached}
              placeholder={
                isLimitReached
                  ? 'Trial limit reached (5/5). Upgrade to Lifetime to convert more...'
                  : 'Paste YouTube link here (e.g. https://www.youtube.com/watch?v=...)'
              }
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          {isLimitReached ? (
            <Link
              href="/upgrade"
              className="bg-red-600 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center min-w-[200px] shadow-md text-sm"
            >
              <Sparkles size={16} className="mr-2" />
              Upgrade for Unlimited
            </Link>
          ) : (
            <button
              type="submit"
              disabled={loading || isLimitReached}
              className="bg-red-600 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center min-w-[200px] disabled:opacity-70 shadow-md text-sm"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Download size={18} className="mr-2" /> Convert to MP3
                </>
              )}
            </button>
          )}
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>{error}</span>
              {isLimitReached && (
                <Link
                  href="/upgrade"
                  className="font-bold underline hover:text-red-900 text-xs shrink-0"
                >
                  Get Lifetime ($29) &rarr;
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle size={18} className="mr-2 text-green-500" />
              Conversion Successful
            </h3>
          </div>
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Video size={32} className="text-red-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-6 max-w-xl truncate">
              {result.title}
            </h4>
            <a
              href={result.link}
              target="_blank"
              rel="noreferrer"
              className="bg-black text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
            >
              <Download size={20} className="mr-2" />
              Download MP3 Now
            </a>
            <p className="text-xs text-gray-400 mt-4">
              Link expires in a few hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
