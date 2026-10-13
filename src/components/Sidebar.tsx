'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Music2, CircleDollarSign, Mail, Search, Sparkles, CheckCircle, Video, FileText, Kanban, Share2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { calculateSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription';

export default function Sidebar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileValid, setIsProfileValid] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const isCheckingRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastValidatedUserIdRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    isMountedRef.current = true;

    supabase.auth
      .getUser()
      .then((res) => {
        if (!isMountedRef.current) return;
        const currentUser = res?.data?.user ?? null;
        setUser(currentUser);
        setIsLoading(false);
        if (currentUser) {
          checkProfile(currentUser.id);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error('Error checking user in Sidebar:', err);
          setIsLoading(false);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMountedRef.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsLoading(false);
        if (event === 'SIGNED_OUT') {
          router.push('/');
        } else if (currentUser) {
          // On auth change (like sign in), check profile
          checkProfile(currentUser.id);
        } else {
          lastValidatedUserIdRef.current = null;
          setIsProfileValid(false);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      authListener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to setup auth

  // Listen to pathname changes for forced onboarding checks during client navigation
  useEffect(() => {
    if (user && isMountedRef.current) {
      checkProfile(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);

  const checkProfile = async (userId: string) => {
    // If we already confirmed this user has a valid profile, no need to check again
    if ((isProfileValid && lastValidatedUserIdRef.current === userId) || isCheckingRef.current) return;

    const normalizedPath = (pathname || '').toLowerCase().replace(/\/+$/, '') || '/';

    // Skip redirect logic if already on login, account, settings, upgrade, checkout or legal pages
    if (
      normalizedPath === '/login' ||
      normalizedPath === '/account' ||
      normalizedPath === '/settings' ||
      normalizedPath === '/terms' ||
      normalizedPath === '/privacy' ||
      normalizedPath === '/cookies' ||
      normalizedPath === '/upgrade' ||
      normalizedPath.startsWith('/checkout')
    )
      return;

    isCheckingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, stage_name, address, base_currency, is_lifetime_paid, trial_ends_at')
        .eq('id', userId)
        .single();

      if (!isMountedRef.current) return;

      if (data) {
        setSubStatus(calculateSubscriptionStatus(data, user?.created_at));
      }

      if (error || !data || !data.full_name || !data.stage_name || !data.address || !data.base_currency) {
        router.push('/account');
      } else {
        lastValidatedUserIdRef.current = userId;
        setIsProfileValid(true);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error checking profile:', err);
      }
    } finally {
      isCheckingRef.current = false;
    }
  };

  const normalizedPath = (pathname || '').toLowerCase().replace(/\/+$/, '') || '/';

  // Standalone pages that provide their own full-page layout without sidebar
  if (
    normalizedPath === '/login' ||
    normalizedPath === '/terms' ||
    normalizedPath === '/privacy' ||
    normalizedPath === '/cookies' ||
    normalizedPath === '/upgrade' ||
    normalizedPath.startsWith('/checkout')
  ) {
    return null;
  }

  if (isLoading) {
    if (normalizedPath === '/') {
      return null;
    }
    return (
      <aside className="w-64 bg-[#fbfbfd] border-r border-[#d2d2d7] h-full flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] print:hidden">
        <div className="p-6 flex items-center space-x-2 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="flex-1 px-4 space-y-4 mt-4 animate-pulse">
          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
        </div>
      </aside>
    );
  }

  // Hide sidebar completely for unauthenticated guests on the root route ('/')
  if (!user && normalizedPath === '/') {
    return null;
  }

  const avatarInitial = (
    user?.email?.trim()?.charAt(0) ||
    user?.user_metadata?.stage_name?.trim()?.charAt(0) ||
    user?.user_metadata?.full_name?.trim()?.charAt(0) ||
    '?'
  ).toUpperCase();

  const userDisplayLabel =
    user?.email?.trim() ||
    user?.user_metadata?.stage_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    (user ? 'Producer' : 'Not logged in');

  return (
    <aside className="w-64 bg-[#fbfbfd] border-r border-[#d2d2d7] h-full flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] print:hidden">
      <div className="px-6 py-5 flex items-center justify-center">
        <Link href="/" className="group flex items-center justify-center focus:outline-none" aria-label="BEATLAB">
          <Image
            src="/img/logo-trimmed.png"
            alt="BEATLAB"
            width={120}
            height={108}
            className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
            priority
          />
          <span className="sr-only">BEATLAB</span>
        </Link>
      </div>
      
      <nav aria-label="Sidebar navigation" className="flex-1 px-4 space-y-1 overflow-y-auto">
        <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />

        <div className="pt-2 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Studio</p>
        </div>
        <NavItem href="/bity" icon={<Music2 size={20} />} label="Beat Catalog" />
        
        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sales</p>
        </div>
        <NavItem href="/finanse" icon={<CircleDollarSign size={20} />} label="Finance" />
        <NavItem href="/licenses" icon={<FileText size={20} />} label="License Generator" />
        <NavItem href="/crm" icon={<Kanban size={20} />} label="Placement CRM" />
        
        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Outreach</p>
        </div>
        <NavItem href="/leads" icon={<Search size={20} />} label="Lead Finder" />
        <NavItem href="/mailer" icon={<Mail size={20} />} label="Mail Tracker" />
        <NavItem href="/validator" icon={<CheckCircle size={20} />} label="Email Validator" />

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</p>
        </div>
        <NavItem href="/downloader" icon={<Video size={20} />} label="YT Downloader" />
        <NavItem href="/publisher" icon={<Share2 size={20} />} label="Social Publisher" />

      </nav>

      <div className="p-4 border-t border-[#d2d2d7]">
        <div className="flex items-center space-x-3 px-3 py-2.5 bg-white rounded-2xl shadow-xs border border-gray-200/80 hover:border-gray-300 transition-all">
          <Link href="/account" className="shrink-0 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center text-white font-semibold text-sm transition-transform group-hover:scale-105">
              {avatarInitial}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href="/account" className="block text-xs font-semibold text-gray-900 truncate hover:text-black">
              {userDisplayLabel}
            </Link>
            {user && subStatus && (
              <div className="mt-1 flex items-center">
                {subStatus.isLifetime ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Lifetime Access
                  </span>
                ) : subStatus.isTrialActive ? (
                  <Link
                    href="/upgrade"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 hover:bg-blue-100 transition-colors"
                    title="Upgrade to Lifetime Access"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Trial ({subStatus.daysRemaining} {subStatus.daysRemaining === 1 ? 'day' : 'days'})</span>
                  </Link>
                ) : (
                  <Link
                    href="/upgrade"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 hover:bg-rose-100 transition-colors"
                    title="Trial expired - unlock lifetime access"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Expired • Upgrade</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-gray-400">
          <Link href="/terms" className="hover:text-black transition-colors">
            Terms
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/privacy" className="hover:text-black transition-colors">
            Privacy
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/cookies" className="hover:text-black transition-colors">
            Cookies
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link 
      href={href} 
      className="group flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm hover:text-black transition-all border border-transparent hover:border-gray-200"
    >
      <span className="text-gray-400 group-hover:text-black transition-colors">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
