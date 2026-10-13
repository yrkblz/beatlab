import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | BeatHelper',
  description:
    'Read the Terms of Service and user agreement for BeatHelper, the minimalist CRM and business management suite for music producers.',
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The binding legal agreement governing your access to and use of the BeatHelper platform, software, and tools."
      lastUpdated="October 10, 2026"
      activeTab="terms"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          1. Agreement to Terms
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;Producer&rdquo;, &ldquo;you&rdquo;) and BeatHelper Inc. (&ldquo;BeatHelper&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), governing your access to and use of the BeatHelper website, web application, and all related services, features, and content (collectively, the &ldquo;Platform&rdquo; or &ldquo;Service&rdquo;).
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          By registering for an account, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our{' '}
          <Link href="/privacy" className="font-semibold text-gray-900 underline hover:text-black">
            Privacy Policy
          </Link>. If you do not agree with any part of these Terms, you must immediately discontinue use of the Service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          2. Eligibility and Account Registration
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          To use BeatHelper, you must be at least 18 years of age (or the age of legal majority in your jurisdiction) and possess the legal capacity to enter into binding contracts. By creating an account, you represent and warrant that all information you submit is accurate, complete, and current.
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li>You are responsible for safeguarding your login credentials and for all activities that occur under your account.</li>
          <li>You may authenticate via Google OAuth or other supported single-sign-on methods. You agree not to share your account credentials with unauthorized third parties.</li>
          <li>You must notify us immediately at <span className="font-medium text-gray-900">security@beathelper.com</span> if you suspect any unauthorized access or breach of security.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          3. Description of the BeatHelper Service
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper provides a cloud-based software suite built specifically for independent music producers, audio engineers, beatmakers, and recording studios. Core features include:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3">
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Beat Catalog Management</h3>
            <p className="text-xs text-gray-600">Upload audio metadata, track BPM, musical keys, tags, and license pricing tiers.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Placement CRM</h3>
            <p className="text-xs text-gray-600">Visual pipeline tracking for artist submissions, major placements, and pending sync deals.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">License Agreement Generator</h3>
            <p className="text-xs text-gray-600">Automated creation of printable and exportable non-exclusive and exclusive beat contracts.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Finance &amp; Outreach Analytics</h3>
            <p className="text-xs text-gray-600">Multi-currency revenue calculations, email outreach tracking, and studio productivity tools.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          4. Producer Intellectual Property &amp; Music Ownership
        </h2>
        <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-2 shadow-sm">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <span>Producer Rights Guarantee</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            You retain 100% full, exclusive ownership of all intellectual property, copyright, publishing rights, master recording rights, and sound recordings that you upload or catalogue within BeatHelper. BeatHelper claims zero copyright or co-publishing interest in your music or creative compositions.
          </p>
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You grant BeatHelper a limited, non-exclusive, worldwide, royalty-free license solely to host, store, cache, and transmit your catalog data as necessary to provide, display, and operate the Platform for you.
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          The BeatHelper platform, brand name, logos, user interface design, source code, workflows, algorithms, and documentation are the exclusive intellectual property of BeatHelper Inc. and protected by copyright and international intellectual property laws.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          5. Beat License Generation &amp; Legal Disclaimers
        </h2>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-900 text-sm leading-relaxed">
          <strong>Important Legal Disclaimer:</strong> BeatHelper is a software provider and not a law firm. The automated license contract generator produces standardized boilerplate templates intended for guidance and commercial convenience only. It does not constitute formal legal counsel or an attorney-client relationship.
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Producers are solely responsible for verifying that their generated license terms (e.g. streaming caps, radio broadcast rights, synchronization allowances, publishing split sheets) comply with their applicable local laws and agreements with third-party rights holders, sample clearing houses, or performing rights organizations (PROs such as ASCAP, BMI, SESAC, PRS).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          6. Permitted Use &amp; Prohibited Conduct
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You agree to use BeatHelper solely for legitimate music production and business management purposes. You agree that you will NOT:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li>Upload audio recordings, samples, or content that infringes upon the copyright, trademark, or rights of any third party.</li>
          <li>Use the Mail Tracker or lead outreach utilities to distribute unsolicited spam, bulk commercial advertisements, or phishing campaigns in violation of CAN-SPAM, GDPR, or relevant anti-spam legislation.</li>
          <li>Attempt to decompile, reverse engineer, disassemble, or derive the source code of the Platform.</li>
          <li>Scrape, index, crawl, or harvest data from the Service using automated scripts or robots without prior written consent.</li>
          <li>Bypass or circumvent rate limits, security tokens, or authentication protocols.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          7. Third-Party Integrations &amp; API Usage
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          The Platform integrates with third-party service providers, including Google OAuth, Google APIs (such as Gmail sending permissions if configured), YouTube Data services, and Supabase cloud infrastructure.
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Your use of features connecting to third-party services is subject to each respective service&rsquo;s terms of service and developer policies. When using YouTube-related utilities, you agree to be bound by the YouTube Terms of Service and Google Privacy Policy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          8. Subscriptions, Fees &amp; Billing
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Certain features of BeatHelper may be offered on a paid subscription or tier basis. Pricing, billing frequencies (monthly or annually), and included quotas are clearly stated on our pricing pages. All payments are billed in advance and are non-refundable except where required by mandatory local consumer protection statutes. You may cancel your subscription at any time via your Account Settings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          9. Disclaimer of Warranties
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT. BEATHELPER DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ACCURATE, OR ERROR-FREE.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          10. Limitation of Liability
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEATHELPER INC., ITS DIRECTORS, EMPLOYEES, AFFILIATES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR MUSIC ROYALTIES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF (OR INABILITY TO USE) THE PLATFORM; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY; OR (C) UNAUTHORIZED ACCESS OR ALTERATION OF YOUR CONTENT. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF ONE HUNDRED US DOLLARS ($100 USD) OR THE AMOUNT PAID BY YOU TO BEATHELPER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          11. Termination
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You may terminate your account at any time via Account Settings. We reserve the right to suspend or terminate your account and access to the Platform immediately, without prior notice, if you breach these Terms, engage in fraudulent or abusive activities, or if required by law.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          12. Governing Law &amp; Dispute Resolution
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          These Terms and any dispute arising out of or related to them shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles. Any legal action or proceeding arising under these Terms shall be brought exclusively in the courts located in Delaware.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          13. Contact Information
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you have questions, concerns, or requests regarding these Terms of Service, please reach out to our legal department:
        </p>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">BeatHelper Inc. — Legal Department</p>
          <p>Email: <a href="mailto:legal@beathelper.com" className="text-black underline font-medium">legal@beathelper.com</a></p>
          <p>Support: <a href="mailto:support@beathelper.com" className="text-black underline font-medium">support@beathelper.com</a></p>
        </div>
      </section>
    </LegalLayout>
  );
}
