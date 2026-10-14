'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const isMountedRef = useRef(true);
  const pathname = usePathname();

  useEffect(() => {
    isMountedRef.current = true;

    supabase.auth
      .getUser()
      .then((res) => {
        if (!isMountedRef.current) return;
        setUser(res?.data?.user ?? null);
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error('Error checking user in LayoutWrapper:', err);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMountedRef.current) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      isMountedRef.current = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const normalizedPath = (pathname || '')
    .split('?')[0]
    .split('#')[0]
    .toLowerCase()
    .trim()
    .replace(/\/+$/, '') || '/';
  
  // For unauthenticated visitors on the root route ('/'), hide margins/padding so Landing Page spans full viewport cleanly.
  // Also support full-width presentation on standalone routes.
  const isFullWidth = (normalizedPath === '/' && !user) ||
    normalizedPath === '/login' ||
    normalizedPath.startsWith('/login/') ||
    normalizedPath === '/terms' ||
    normalizedPath.startsWith('/terms/') ||
    normalizedPath === '/privacy' ||
    normalizedPath.startsWith('/privacy/') ||
    normalizedPath === '/cookies' ||
    normalizedPath.startsWith('/cookies/') ||
    normalizedPath === '/upgrade' ||
    normalizedPath.startsWith('/upgrade/') ||
    normalizedPath === '/checkout' ||
    normalizedPath.startsWith('/checkout/');

  return (
    <main
      data-testid="main-layout-wrapper"
      className={`flex-1 overflow-y-auto print:p-0 print:overflow-visible ${
        isFullWidth ? 'p-0' : 'p-8'
      }`}
    >
      {children}
    </main>
  );
}
