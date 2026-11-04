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
      lastUpdated="October 28, 2026"
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
          By registering for an account, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms, our{' '}
          <Link href="/privacy" className="font-semibold text-gray-900 underline hover:text-black">
            Privacy Policy
          </Link>
          , and our{' '}
          <Link href="/data-deletion" className="font-semibold text-gray-900 underline hover:text-black">
            Data Deletion Policy
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
          <li>You must notify us immediately at <span className="font-medium text-gray-900">beatlab.space@gmail.com</span> if you suspect any unauthorized access or breach of security.</li>
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
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Placement CRM &amp; Lead Scout</h3>
            <p className="text-xs text-gray-600">Visual pipeline tracking for artist submissions, major placements, and client negotiations.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">License Agreement Generator</h3>
            <p className="text-xs text-gray-600">Automated creation of printable and exportable non-exclusive and exclusive beat contracts.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Outreach Mailer &amp; Finance</h3>
            <p className="text-xs text-gray-600">Multi-currency revenue calculations, user-directed Google email outreach, and studio productivity tools.</p>
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
          Producers are solely responsible for verifying that their generated license terms (e.g. streaming caps, radio broadcast rights, synchronization allowances, publishing split sheets) comply with their applicable local laws and agreements with third-party rights holders, sample clearing houses, or performing rights organizations (PROs such as ASCAP, BMI, SESAC, PRS, ZAIKS).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          6. Permitted Use, Outreach Conduct &amp; Anti-Spam Rules
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You agree to use BeatHelper solely for legitimate music production and business management purposes. When utilizing the Platform&rsquo;s email outreach tools (Mailer) and CRM features:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Anti-Spam Compliance:</strong> You must strictly adhere to the CAN-SPAM Act, the General Data Protection Regulation (GDPR), and equivalent anti-spam statutes. You agree not to distribute unsolicited bulk commercial emails or misleading pitches to recipients who have not consented or do not have a legitimate business interest in your music.</li>
          <li><strong>Accurate Sender Identity:</strong> All communications sent via connected Google accounts must truthfully identify you as the sender and include an accurate subject line and valid contact details.</li>
          <li><strong>Opt-Out Respect:</strong> If any artist, manager, or A&amp;R requests to be removed from your outreach list, you must immediately cease contacting them.</li>
          <li><strong>Copyright Integrity:</strong> You agree NOT to upload, pitch, or distribute beats or recordings that infringe upon third-party copyrights, unauthorized sample packs, or uncleared master recordings.</li>
          <li><strong>System Integrity:</strong> You agree not to scrape, index, reverse engineer, or exploit the Platform through automated bots or circumvent API rate limits.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          7. Third-Party Integrations &amp; Platform Rules
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          The Platform integrates with third-party services and APIs. Your use of these integrated features is expressly conditioned on your compliance with each respective provider&rsquo;s terms and policies:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Google APIs &amp; YouTube:</strong> By utilizing Google OAuth, Gmail dispatch (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">gmail.send</code>), Google Drive stems selection (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">drive.readonly</code>), or YouTube links, you agree to be bound by the <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Terms of Service</a> and the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">YouTube Terms of Service</a>.</li>
          <li><strong>Meta &amp; Instagram:</strong> When organizing leads or viewing public artist profiles from Instagram, you agree to comply with the <a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" className="underline font-medium">Instagram Terms of Use</a> and <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta Platform Terms</a>. Automated scraping, stalking, or harassment of Instagram users is strictly prohibited.</li>
          <li><strong>TikTok:</strong> When referencing TikTok sound links or creator accounts, you agree to comply with the <a href="https://www.tiktok.com/legal/page/row/terms-of-service/en" target="_blank" rel="noopener noreferrer" className="underline font-medium">TikTok Terms of Service</a> and Community Guidelines.</li>
          <li><strong>Stripe:</strong> Payment processing for subscriptions and licenses is handled securely by Stripe and subject to the <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="underline font-medium">Stripe Services Agreement</a>.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          8. DMCA Copyright Notice &amp; Takedown Procedure
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper respects the intellectual property rights of artists, producers, and copyright holders. In accordance with the Digital Millennium Copyright Act (17 U.S.C. § 512), if you believe that any material residing on or accessible through BeatHelper infringes your copyright, please send a written notification to our Designated Copyright Agent at <a href="mailto:beatlab.space@gmail.com" className="font-semibold text-black underline">beatlab.space@gmail.com</a> containing:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 ml-2">
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>Identification of the material that is claimed to be infringing and its location on the Platform.</li>
          <li>Your contact details, including full name, address, telephone number, and email.</li>
          <li>A statement made under penalty of perjury that the information in the notification is accurate and you are authorized to act on behalf of the copyright owner.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          9. Subscriptions, Fees &amp; Billing
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Certain features of BeatHelper may be offered on a paid subscription or tier basis. Pricing, billing frequencies (monthly or annually), and included quotas are clearly stated on our pricing pages. All payments are billed in advance and are non-refundable except where required by mandatory local consumer protection statutes. You may cancel your subscription at any time via your Account Settings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          10. Disclaimer of Warranties
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT. BEATHELPER DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ACCURATE, OR ERROR-FREE.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          11. Limitation of Liability
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEATHELPER INC., ITS DIRECTORS, EMPLOYEES, AFFILIATES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR MUSIC ROYALTIES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF (OR INABILITY TO USE) THE PLATFORM; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY; OR (C) UNAUTHORIZED ACCESS OR ALTERATION OF YOUR CONTENT. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF ONE HUNDRED US DOLLARS ($100 USD) OR THE AMOUNT PAID BY YOU TO BEATHELPER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          12. Termination &amp; Account Deletion
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You may terminate your account at any time via Account Settings or by following our <Link href="/data-deletion" className="font-semibold text-black underline">User Data Deletion Instructions</Link>. We reserve the right to suspend or terminate your account immediately, without prior notice, if you breach these Terms, engage in fraudulent or abusive activities, or if required by law.
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
          <p>Email: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
          <p>Support: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
          <p>Data Deletion: <Link href="/data-deletion" className="text-black underline font-medium">https://beatlab.space/data-deletion</Link></p>
        </div>
      </section>
    </LegalLayout>
  );
}
