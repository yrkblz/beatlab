'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
  calculateSubscriptionStatus,
  isProfileComplete,
  isStudioRoute,
  isAccountRoute,
  normalizeRoutePath,
  STUDIO_TOOL_NAMES,
  PROTECTED_STUDIO_ROUTES,
  type SubscriptionStatus,
} from '@/lib/subscription';
import PaywallBlocker from '@/components/PaywallBlocker';
import { Loader2 } from 'lucide-react';

interface StudioGuardProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: any;
}

export default function StudioGuard({
  children,
  initialUser,
  initialProfile,
}: StudioGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [profile, setProfile] = useState<any>(initialProfile ?? null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(initialUser === undefined);
  const [isProfileLoaded, setIsProfileLoaded] = useState(initialProfile !== undefined);
  const [isLoadingProfile, setIsLoadingProfile] = useState(
    initialUser !== null && initialProfile === undefined
  );
  const [, setTick] = useState(0);

  const isMountedRef = useRef(true);

  const normalizedPath = normalizeRoutePath(pathname);
  const isStudio = isStudioRoute(normalizedPath);
  const isAccount = isAccountRoute(normalizedPath);
  const isProtected = isStudio || isAccount;

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    setIsLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, stage_name, base_currency, is_lifetime_paid, trial_ends_at, created_at')
        .eq('id', userId)
        .single();

      if (!isMountedRef.current) return;
      if (error || !data) {
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Error fetching profile in StudioGuard:', err);
      setProfile(null);
    } finally {
      if (isMountedRef.current) {
        setIsProfileLoaded(true);
        setIsLoadingProfile(false);
      }
    }
  }, []);

  // 1. Authentication check and listener
  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMountedRef.current) return;
        const currentUser = data?.user ?? null;
        setUser(currentUser);
        setIsLoadingAuth(false);
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        console.error('Error in StudioGuard auth check:', err);
        setUser(null);
        setIsLoadingAuth(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMountedRef.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsLoadingAuth(false);
        if (!currentUser) {
          setProfile(null);
          setIsProfileLoaded(false);
          setIsLoadingProfile(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [initialUser]);

  // 2. Fetch producer profile whenever authenticated user is resolved
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setProfile(null);
      setIsProfileLoaded(false);
      setIsLoadingProfile(false);
      return;
    }

    if (initialProfile !== undefined) {
      setProfile(initialProfile);
      setIsProfileLoaded(true);
      setIsLoadingProfile(false);
      return;
    }

    setIsProfileLoaded(false);
    setIsLoadingProfile(true);
    fetchProfile(user.id);
  }, [user, isLoadingAuth, initialProfile, fetchProfile]);

  // 3. Listen to profile updates (e.g. saved from /account or checkout)
  useEffect(() => {
    const handleProfileUpdated = (event: any) => {
      if (event?.detail && typeof event.detail === 'object' && Object.keys(event.detail).length > 0) {
        setProfile((prev: any) => ({ ...(prev || {}), ...event.detail }));
        setIsProfileLoaded(true);
        setIsLoadingProfile(false);
      } else if (user) {
        fetchProfile(user.id);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beatlab:profile-updated', handleProfileUpdated);
      return () => {
        window.removeEventListener('beatlab:profile-updated', handleProfileUpdated);
      };
    }
  }, [user, fetchProfile]);

  // 4. Live timer to immediately trigger paywall block when active trial expires
  useEffect(() => {
    if (!isStudio || !user || !profile || profile.is_lifetime_paid) return;

    const sub = calculateSubscriptionStatus(profile, user.created_at);
    if (!sub.isTrialActive || !sub.trialEndsAt) return;

    const msRemaining = sub.trialEndsAt.getTime() - Date.now();
    if (msRemaining <= 0) {
      setTick((t) => t + 1);
      return;
    }

    const timer = setTimeout(() => {
      setTick((t) => t + 1);
    }, Math.min(msRemaining + 100, 2147483647));

    return () => clearTimeout(timer);
  }, [isStudio, user, profile]);

  // 5. Navigation redirects for unauthenticated guests (preserving destination, search & hash)
  useEffect(() => {
    if (!isLoadingAuth && !user && isProtected) {
      const destination =
        (pathname || '/') +
        (typeof window !== 'undefined'
          ? (window.location.search || '') + (window.location.hash || '')
          : '');
      const redirectTarget = `/login?next=${encodeURIComponent(destination)}`;
      if (router && typeof router.replace === 'function') {
        router.replace(redirectTarget);
      } else if (router && typeof router.push === 'function') {
        router.push(redirectTarget);
      }
    }
  }, [isLoadingAuth, user, isProtected, pathname, router]);

  // 6. Navigation redirects for authenticated users with incomplete profiles on studio routes
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingProfile && isProfileLoaded && user && isStudio) {
      const currentSub = calculateSubscriptionStatus(profile, user.created_at);
      // Expired trial users are hard-blocked by PaywallBlocker directly on studio routes (no redirect)
      if (currentSub.isTrialExpired && !currentSub.isLifetime) {
        return;
      }
      if (!isProfileComplete(profile)) {
        if (router && typeof router.replace === 'function') {
          router.replace('/account?tab=profile');
        } else if (router && typeof router.push === 'function') {
          router.push('/account?tab=profile');
        }
      }
    }
  }, [isLoadingAuth, isLoadingProfile, isProfileLoaded, user, isStudio, profile, router]);

  // Public routes pass through unconditionally
  if (!isProtected) {
    return <>{children}</>;
  }

  // Loading authentication state
  if (isLoadingAuth) {
    return (
      <div
        data-testid="studio-guard-loading"
        className="min-h-[60vh] flex items-center justify-center p-8"
      >
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin text-gray-800" size={32} />
          <span className="text-sm font-medium">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated guest on protected route -> redirecting state
  if (!user) {
    return (
      <div
        data-testid="studio-guard-redirecting"
        className="min-h-[60vh] flex items-center justify-center p-8"
      >
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin text-gray-800" size={32} />
          <span className="text-sm font-medium">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  // Authenticated user on /account -> allow access so user can configure profile/settings
  if (isAccount) {
    return <>{children}</>;
  }

  // Loading profile state for studio routes
  if (isLoadingProfile || !isProfileLoaded) {
    return (
      <div
        data-testid="studio-guard-loading-profile"
        className="min-h-[60vh] flex items-center justify-center p-8"
      >
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin text-gray-800" size={32} />
          <span className="text-sm font-medium">Verifying producer profile...</span>
        </div>
      </div>
    );
  }

  // Expired 3-day trial without lifetime access -> 100% hard paywall block directly on studio route
  const currentSubStatus = calculateSubscriptionStatus(profile, user.created_at);

  if (currentSubStatus.isTrialExpired && !currentSubStatus.isLifetime) {
    const baseRoute = PROTECTED_STUDIO_ROUTES.find(
      (route) => normalizedPath === route || normalizedPath.startsWith(route + '/')
    );
    const toolName = (baseRoute && STUDIO_TOOL_NAMES[baseRoute]) || 'this module';
    return (
      <div data-testid="studio-guard-paywall">
        <PaywallBlocker toolName={toolName} />
      </div>
    );
  }

  // Incomplete profile on studio routes -> redirecting to onboarding
  if (!isProfileComplete(profile)) {
    return (
      <div
        data-testid="studio-guard-onboarding-redirect"
        className="min-h-[60vh] flex items-center justify-center p-8"
      >
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin text-gray-800" size={32} />
          <span className="text-sm font-medium">
            Redirecting to profile onboarding...
          </span>
        </div>
      </div>
    );
  }

  // Active trial or lifetime pass -> full studio access
  return <>{children}</>;
}
