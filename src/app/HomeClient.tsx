'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import TiltCard from '@/components/TiltCard';
import { MiniAudioEqualizer } from '@/components/AudioWaveform';
import MagneticButton from '@/components/MagneticButton';
import LiveMetrics from '@/components/LiveMetrics';
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  Kanban,
  FileText,
  CircleDollarSign,
  Music2,
  Mail,
  Search,
  ShieldCheck,
  Video,
  Share2,
} from 'lucide-react';

export const DASHBOARD_CARDS = [
  {
    title: 'Beat Catalog',
    href: '/bity',
    icon: Music2,
    badge: 'Audio',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
    description: 'Upload, tag, and organize MP3 and WAV files with automatic key & BPM detection.',
    action: 'Open Catalog',
  },
  {
    title: 'Finance',
    href: '/finanse',
    icon: CircleDollarSign,
    badge: 'Revenue',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    description: 'Track net beat sales, multi-currency revenue, and analyze monthly profit streams.',
    action: 'View Finance',
  },
  {
    title: 'Placement CRM',
    href: '/crm',
    icon: Kanban,
    badge: 'Outreach',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-100',
    description: 'Visual Kanban pipeline to track beat pitches to artists and A&Rs from pitch to placement.',
    action: 'Manage Placements',
  },
  {
    title: 'License Generator',
    href: '/licenses',
    icon: FileText,
    badge: 'Contracts',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
    description: 'Generate customized legal contracts for MP3, WAV, Trackouts, and Exclusive rights in seconds.',
    action: 'Create License',
  },
  {
    title: 'Mail Tracker',
    href: '/mailer',
    icon: Mail,
    badge: 'Outreach',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    description: 'Send beat packages via Gmail with instant email open and link click tracking.',
    action: 'Open Mailer',
  },
  {
    title: 'Lead Finder',
    href: '/leads',
    icon: Search,
    badge: 'Growth',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-100',
    description: 'Discover indie artists and video creators on YouTube actively looking for producer beats.',
    action: 'Find Leads',
  },
  {
    title: 'Email Validator',
    href: '/validator',
    icon: ShieldCheck,
    badge: 'Deliverability',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-100',
    description: 'Verify artist and industry email addresses to protect domain sender reputation.',
    action: 'Validate Emails',
  },
  {
    title: 'YT Downloader',
    href: '/downloader',
    icon: Video,
    badge: 'Utility',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
    description: 'Download reference audio and video stems directly from YouTube for studio analysis.',
    action: 'Open Downloader',
  },
  {
    title: 'Social Publisher',
    href: '/publisher',
    icon: Share2,
    badge: 'Social Media',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-100',
    description: 'Upload and auto-publish video snippets directly to TikTok and Instagram Reels.',
    action: 'Open Publisher',
  },
];

export function Dashboard({ user }: { user?: User | null }) {
  const displayName =
    user?.user_metadata?.stage_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.trim() ||
    '';

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Dashboard Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back{displayName ? `, ${displayName}` : ''}. Manage your catalog, track deals, and scale your studio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-black hover:border-gray-300 transition-all shadow-xs"
          >
            Account Settings
          </Link>
        </div>
      </div>

      {/* Squares / Cards Grid linking to features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:border-black hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-black transition-colors mb-2">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700 group-hover:text-black transition-colors">
                <span>{card.action}</span>
                <ArrowRight
                  size={14}
                  className="transform group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Status Bar */}
      <div className="mt-8 bg-gray-50/70 border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle size={18} aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Studio Workspace Active</h4>
            <p className="text-xs text-gray-500">Connected to cloud database with live data synchronization.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm"
            className="px-3.5 py-2 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors shadow-2xs"
          >
            Quick Pitch
          </Link>
          <Link
            href="/licenses"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-black rounded-lg hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            New License
          </Link>
        </div>
      </div>

      {/* Dashboard Legal Sub-Footer */}
      <footer className="mt-14 pt-8 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div>
          &copy; 2026 BEATLAB Inc. All rights reserved.
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
        </div>
      </footer>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="w-full bg-white text-gray-900 min-h-full flex flex-col font-sans selection:bg-black selection:text-white overflow-x-clip scroll-smooth">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center group focus:outline-none" aria-label="BEATLAB">
            <Image
              src="/img/napis-black.png"
              alt="BEATLAB"
              width={160}
              height={26}
              className="h-6 sm:h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              priority
            />
            <span className="sr-only">BEATLAB</span>
            <span className="sr-only">Studio Suite</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-black transition-colors">
              Features
            </a>
            <a href="#modules" className="hover:text-black transition-colors">
              All Modules
            </a>
            <a href="#workflow" className="hover:text-black transition-colors">
              Workflow
            </a>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="relative overflow-hidden group px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-black rounded-xl hover:bg-neutral-800 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="relative z-10">Get Started</span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-12 pt-14 pb-20 md:pt-20 md:pb-28 max-w-7xl mx-auto text-center w-full overflow-hidden">
        {/* Floating Interactive Micro-Badges */}
        <div className="absolute top-8 left-4 lg:left-12 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-gray-200/80 shadow-xs text-xs font-medium text-gray-700 animate-float-badge pointer-events-none select-none z-10">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span>🎹 140 BPM Trap Beat</span>
        </div>
        <div className="absolute top-16 right-4 lg:right-14 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-gray-200/80 shadow-xs text-xs font-medium text-gray-700 animate-float-badge-delayed pointer-events-none select-none z-10">
          <span className="text-emerald-500 font-bold">$</span>
          <span>+$500 Exclusive Sold</span>
        </div>
        <div className="absolute top-36 left-2 lg:left-8 hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-gray-200/70 shadow-xs text-[11px] font-medium text-gray-600 animate-float-badge pointer-events-none select-none z-10">
          <span>⚡ Instant Stems Export</span>
        </div>
        <div className="absolute top-44 right-2 lg:right-10 hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-gray-200/70 shadow-xs text-[11px] font-medium text-gray-600 animate-float-badge-delayed pointer-events-none select-none z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>🔥 A&amp;R Pitch Accepted</span>
        </div>

        {/* Flagship BEATLAB Hero Logo */}
        <div className="flex justify-center items-center mb-8">
          <div className="relative group transition-transform duration-300 hover:scale-105">
            <Image
              src="/img/logo-trimmed.png"
              alt="BEATLAB"
              width={360}
              height={324}
              className="w-56 sm:w-72 md:w-80 lg:w-[340px] max-w-full h-auto object-contain drop-shadow-md select-none"
              priority
            />
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-[1.12]">
          Scale Your Beat Business with Intelligent Producer Tools
        </h1>

        {/* CTA Buttons with Magnetic Effect */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <MagneticButton maxDistance={10}>
            <Link
              href="/login"
              className="relative overflow-hidden group w-full sm:w-auto px-8 py-3.5 bg-black text-white text-base font-semibold rounded-xl hover:bg-neutral-800 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Managing Beats
                <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform duration-200" aria-hidden="true" />
              </span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
            </Link>
          </MagneticButton>

          <MagneticButton maxDistance={10}>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-gray-200 text-gray-800 text-base font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:text-black transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
            >
              Explore Core Modules
            </a>
          </MagneticButton>
        </div>

        {/* Micro-trust indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 transition-colors hover:text-gray-900">
            <CheckCircle size={15} className="text-emerald-500" aria-hidden="true" /> Free 14-day trial
          </span>
          <span className="flex items-center gap-1.5 transition-colors hover:text-gray-900">
            <CheckCircle size={15} className="text-emerald-500" aria-hidden="true" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5 transition-colors hover:text-gray-900">
            <CheckCircle size={15} className="text-emerald-500" aria-hidden="true" /> Instant studio setup
          </span>
        </div>

        {/* Visual Dashboard Mockup Card with 3D Tilt Elements & Subtle Shimmer Border */}
        <div className="mt-14 max-w-5xl mx-auto bg-gray-50/70 border border-gray-200 hover:border-gray-300 rounded-2xl p-4 sm:p-6 shadow-xl shadow-gray-200/50 transition-all duration-300">
          {/* Mockup Header Bar with Equalizer Waveform Indicator */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="ml-2 text-xs font-mono text-gray-400 truncate max-w-[180px] sm:max-w-none">beatlab.app/studio-workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <MiniAudioEqualizer bars={8} active={true} className="text-emerald-600 hidden sm:inline-flex" />
              <span className="px-2.5 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                ● Live Cloud Sync
              </span>
            </div>
          </div>

          {/* 3-Card Mini Showcase Preview with 3D Tilt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* Widget 1: Placement CRM */}
            <TiltCard maxTilt={8} scale={1.02} className="h-full">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Placement CRM</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-md border border-blue-100 flex items-center gap-1">
                      Listened 🎧 <MiniAudioEqualizer bars={3} active={true} className="text-blue-600 inline-flex" />
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Lil Baby • &quot;Midnight Trap 140BPM&quot;</p>
                  <p className="text-xs text-gray-500 mt-1">A&amp;R confirmed listening session. Pending contract terms.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Outreach: Instagram DM</span>
                  <span className="font-medium text-gray-900">Stage 3 of 4</span>
                </div>
              </div>
            </TiltCard>

            {/* Widget 2: License Generator */}
            <TiltCard maxTilt={8} scale={1.02} className="h-full">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">License Generator</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md border border-emerald-100">
                      Export Ready 📄
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Exclusive Rights Agreement #8491</p>
                  <p className="text-xs text-gray-500 mt-1">Buyer: Atlantic Records • 50/50 Publishing split included.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Format: PDF / Print</span>
                  <span className="font-semibold text-emerald-600">$500.00 Flat</span>
                </div>
              </div>
            </TiltCard>

            {/* Widget 3: Finance Analytics */}
            <TiltCard maxTilt={8} scale={1.02} className="h-full">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Monthly Revenue</span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-md border border-purple-100">
                      +32.4% MoM 📈
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">$4,850.00 Net Beat Sales</p>
                  <p className="text-xs text-gray-500 mt-1">18 MP3 Leases • 6 WAV Leases • 2 Exclusive Rights</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Active Currencies</span>
                  <span className="font-medium text-gray-900">USD, EUR, PLN</span>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>

      </section>

      {/* Interactive Studio Live Metrics Section */}
      <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full border-t border-gray-100">
        <LiveMetrics />
      </section>

      {/* Features Section - Highlighting Core Modules (CRM, License Generator, Finance) */}
      <section id="features" className="py-20 bg-gray-50/60 border-y border-gray-200 px-6 lg:px-12 w-full scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-800 mb-4 shadow-2xs">
              <Sparkles size={14} className="text-black" aria-hidden="true" />
              <span>Core Modules</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Everything You Need to Run Your Studio Like a Business
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              BEATLAB brings the three pillars of modern music production into one unified, elegant workspace.
            </p>
          </div>

          {/* 3 Main Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Feature 1: Placement CRM */}
            <TiltCard maxTilt={6} scale={1.015} className="h-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                    <Kanban size={24} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Module 01</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1 mb-3">Placement CRM</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Stop losing potential major placements in chaotic Instagram DMs and buried email threads. Track every pitch through a proven 4-stage pipeline.
                  </p>

                  <ul className="space-y-3 mb-8 text-sm text-gray-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Visual Kanban Pipeline:</strong> Move opportunities across <em>To Send</em>, <em>Sent</em>, <em>Listened</em>, and <em>Placement</em>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Artist &amp; Beat Log:</strong> Attach specific beat titles, contact notes, and outreach channels directly to each card.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Follow-Up Readiness:</strong> Never forget which A&amp;R or artist is currently reviewing your beat pack.
                      </span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/crm"
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group/btn hover:shadow-2xs"
                >
                  Open Placement CRM
                  <ArrowRight size={16} className="transform group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </div>
            </TiltCard>

            {/* Feature 2: License Generator */}
            <TiltCard maxTilt={6} scale={1.015} className="h-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                    <FileText size={24} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Module 02</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1 mb-3">License Generator</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Generate bulletproof, legally binding contracts in under 30 seconds. Protect your publishing rights and prevent copyright disputes effortlessly.
                  </p>

                  <ul className="space-y-3 mb-8 text-sm text-gray-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Multi-Tier Licensing:</strong> Instant templates for MP3 Lease, WAV Lease, Trackouts, and Exclusive rights agreements.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Custom Terms &amp; Splits:</strong> Define streaming limits, radio play allowance, and publishing splits with ease.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">One-Click PDF &amp; Print:</strong> Generates formatted legal documents ready for signature and record-keeping.
                      </span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/licenses"
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group/btn hover:shadow-2xs"
                >
                  Generate a License
                  <ArrowRight size={16} className="transform group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </div>
            </TiltCard>

            {/* Feature 3: Finance & Sales */}
            <TiltCard maxTilt={6} scale={1.015} className="h-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                    <CircleDollarSign size={24} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Module 03</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1 mb-3">Finance &amp; Sales</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Gain complete financial clarity over your production revenue. Monitor your daily lease sales, custom commissions, and royalties all in one place.
                  </p>

                  <ul className="space-y-3 mb-8 text-sm text-gray-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Multi-Currency Support:</strong> Seamlessly log payments in USD, EUR, PLN, UAH, and RUB without manual conversion.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Time &amp; Tier Filters:</strong> Review earnings by All-Time, Year, Month, Last 7 Days, or custom date ranges.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong className="text-gray-900">Tier Breakdown:</strong> Identify your most profitable license types to optimize your pricing strategy.
                      </span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/finanse"
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group/btn hover:shadow-2xs"
                >
                  View Finance Hub
                  <ArrowRight size={16} className="transform group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Extended Ecosystem Suite */}
      <section id="modules" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            The Complete Producer Ecosystem
          </h2>
          <p className="mt-3 text-gray-600 text-sm sm:text-base">
            BEATLAB replaces disconnected subscriptions with a single streamlined platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Instrument 1: Beat Catalog */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Music2 size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Beat Catalog</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Upload, tag, and organize your MP3 and WAV files with instant key and BPM recognition.
                </p>
              </div>
              <Link href="/bity" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-blue-600 group-hover:translate-x-0.5 transition-transform">
                Open Catalog <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 2: Placement CRM */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Kanban size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Placement CRM</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Track your beat pitches through a visual 4-stage pipeline from sent to signed placement.
                </p>
              </div>
              <Link href="/crm" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-purple-600 group-hover:translate-x-0.5 transition-transform">
                Manage Placements <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 3: License Generator */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileText size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">License Generator</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Create print-ready contracts for MP3, WAV, Trackout, Unlimited, and Exclusive rights in seconds.
                </p>
              </div>
              <Link href="/licenses" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-amber-600 group-hover:translate-x-0.5 transition-transform">
                Create License <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 4: Finance Hub */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <CircleDollarSign size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Finance &amp; Sales</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Monitor beat revenue across 5 currencies with real-time conversion and sales breakdowns.
                </p>
              </div>
              <Link href="/finanse" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                View Finance <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 5: Mail Tracker */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Mail size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Mail Tracker</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Send beat packs directly via Gmail and get real-time tracking when artists open your links.
                </p>
              </div>
              <Link href="/mailer" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                Open Mailer <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 6: Lead Finder */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Search size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Lead Finder</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Discover new recording artists and creators on YouTube actively searching for beat collaborations.
                </p>
              </div>
              <Link href="/leads" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-rose-600 group-hover:translate-x-0.5 transition-transform">
                Find Leads <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 7: Email Validator */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Email Validator</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Verify recipient mailboxes before launching email blasts to protect your sender reputation.
                </p>
              </div>
              <Link href="/validator" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-teal-600 group-hover:translate-x-0.5 transition-transform">
                Validate List <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 8: YT Downloader */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Video size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">YT Downloader</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Download reference audio and video stems directly from YouTube for studio analysis.
                </p>
              </div>
              <Link href="/downloader" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-sky-600 group-hover:translate-x-0.5 transition-transform">
                Open Downloader <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>

          {/* Instrument 9: Social Publisher */}
          <TiltCard maxTilt={6} scale={1.015} className="h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Share2 size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Social Publisher</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Upload and auto-publish video snippets and beat previews directly to TikTok and Instagram Reels.
                </p>
              </div>
              <Link href="/publisher" className="mt-5 inline-flex items-center text-xs font-semibold text-black hover:text-pink-600 group-hover:translate-x-0.5 transition-transform">
                Open Publisher <ArrowRight size={12} className="ml-1" aria-hidden="true" />
              </Link>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 bg-gray-50/60 border-y border-gray-200 px-6 lg:px-12 w-full scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Designed for the Real Producer Workflow
            </h2>
            <p className="mt-3 text-gray-600 text-sm sm:text-base">
              From the initial studio session to signing the royalty agreement in 3 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TiltCard maxTilt={5} scale={1.015} className="h-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-7 relative shadow-xs h-full group hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-black text-white font-bold flex items-center justify-center text-sm mb-4 group-hover:scale-105 transition-transform">
                  01
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Upload &amp; Catalog</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Store your beats, set baseline pricing for MP3/WAV/Exclusive tiers, and configure default contract parameters.
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={5} scale={1.015} className="h-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-7 relative shadow-xs h-full group hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-black text-white font-bold flex items-center justify-center text-sm mb-4 group-hover:scale-105 transition-transform">
                  02
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Pitch &amp; Track Placements</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Find artist leads, send Gmail beat packs with tracking pixels, and organize active artist negotiations in your CRM.
                </p>
              </div>
            </TiltCard>

            <TiltCard maxTilt={5} scale={1.015} className="h-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-7 relative shadow-xs h-full group hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-black text-white font-bold flex items-center justify-center text-sm mb-4 group-hover:scale-105 transition-transform">
                  03
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">License &amp; Bank Revenue</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Produce print-ready contracts in one click, collect payments, and watch your monthly revenue grow.
                </p>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="bg-black text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-xs font-semibold mb-6">
              Ready to Professionalize?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Take Control of Your Beat Business Today
            </h2>
            <p className="mt-4 text-neutral-300 text-base sm:text-lg leading-relaxed">
              Join independent producers who manage their music catalog, legal contracts, and sales like a serious business.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="relative overflow-hidden group w-full sm:w-auto px-8 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-neutral-100 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started with BEATLAB
                  <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform duration-200" aria-hidden="true" />
                </span>
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-black/10 to-transparent" aria-hidden="true" />
              </Link>
              <Link
                href="/crm"
                className="w-full sm:w-auto px-8 py-3.5 bg-neutral-900 border border-neutral-700 text-white font-medium rounded-xl hover:bg-neutral-800 hover:border-neutral-500 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
              >
                View Live Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="mt-auto border-t border-gray-200 bg-gray-50/80 py-14 px-6 lg:px-12 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center mb-4 group focus:outline-none" aria-label="BEATLAB">
              <Image
                src="/img/napis-black.png"
                alt="BEATLAB"
                width={140}
                height={24}
                className="h-6 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="sr-only">BEATLAB</span>
            </Link>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
              The minimalist operating system for music producers. Streamlining artist CRM, automated licensing, and finance tracking.
            </p>
            <div className="text-xs text-gray-400">
              Built for independent producers, beatmakers, and studios worldwide.
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Core Modules</h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <Link href="/crm" className="hover:text-black transition-colors">
                  Placement CRM
                </Link>
              </li>
              <li>
                <Link href="/licenses" className="hover:text-black transition-colors">
                  License Generator
                </Link>
              </li>
              <li>
                <Link href="/finanse" className="hover:text-black transition-colors">
                  Finance Analytics
                </Link>
              </li>
              <li>
                <Link href="/bity" className="hover:text-black transition-colors">
                  Beat Catalog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Tools &amp; Outreach</h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <Link href="/mailer" className="hover:text-black transition-colors">
                  Mail Tracker
                </Link>
              </li>
              <li>
                <Link href="/leads" className="hover:text-black transition-colors">
                  Lead Finder
                </Link>
              </li>
              <li>
                <Link href="/validator" className="hover:text-black transition-colors">
                  Email Validator
                </Link>
              </li>
              <li>
                <Link href="/downloader" className="hover:text-black transition-colors">
                  YT Downloader
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <Link href="/login" className="hover:text-black transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-black transition-colors">
                  Account Settings
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-black transition-colors">
                  Feature Tour
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-black transition-colors">
                  Workflow
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Sub-Footer */}
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            &copy; 2026 BEATLAB Inc. All rights reserved.
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
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomeClient({ initialUser }: { initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const initialUserRef = useRef(initialUser);

  // Sync if initialUser changes from caller
  useEffect(() => {
    initialUserRef.current = initialUser;
    if (initialUser !== undefined) {
      setUser(initialUser);
    }
  }, [initialUser]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getUser()
      .then((res) => {
        if (isMounted) {
          if (res?.data?.user) {
            setUser((prev) => prev ?? res.data.user);
          } else if (!initialUserRef.current) {
            setUser((prev) => prev ?? null);
          }
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Error fetching Supabase user in HomeClient:', err);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user) {
    return <Dashboard user={user} />;
  }

  return <LandingPage />;
}
