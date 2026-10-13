import React from 'react';
import type { Metadata } from 'next';
import type { User } from '@supabase/supabase-js';
import HomeClient, { Dashboard, LandingPage } from './HomeClient';

export const metadata: Metadata = {
  title: 'BEATLAB | Intelligent Producer Tools & Studio CRM',
  description:
    'Scale your beat business with intelligent producer tools: visual placement CRM, instant beat license agreements, and multi-currency revenue tracking.',
  openGraph: {
    title: 'BEATLAB | Intelligent Producer Tools & Studio CRM',
    description:
      'Scale your beat business with intelligent producer tools: visual placement CRM, instant beat license agreements, and multi-currency revenue tracking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BEATLAB | Intelligent Producer Tools & Studio CRM',
    description:
      'Scale your beat business with intelligent producer tools: visual placement CRM, instant beat license agreements, and multi-currency revenue tracking.',
  },
};

export { Dashboard, LandingPage };

export default function Home({ initialUser }: { initialUser?: User | null } = {}) {
  return <HomeClient initialUser={initialUser} />;
}
