import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | BeatHelper',
  description:
    'BeatHelper Privacy Policy: learn how we collect, protect, and handle producer account data, third-party integrations, and Google API user data.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How BeatHelper collects, handles, stores, and protects your personal data and creative studio records."
      lastUpdated="October 10, 2026"
      activeTab="privacy"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          1. Introduction
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          At BeatHelper Inc. (&ldquo;BeatHelper&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), we respect your privacy and are committed to safeguarding your personal information. This Privacy Policy outlines what information we collect when you visit our website, use our SaaS web application, and interact with our integrated producer tools, and explains how we process, store, and protect that data in accordance with applicable privacy regulations, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA/CPRA).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          2. Information We Collect
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We collect information directly from you when you provide it, automatically when you navigate through the Platform, and through third-party services you authorize.
        </p>
        
        <div className="space-y-4 pt-2">
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">A. Producer Account &amp; Profile Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              When creating an account or updating your profile, we collect your full legal name, producer / stage name, email address, physical studio address (used for legal contracts and split sheets), and your default studio base currency (e.g., USD, EUR, GBP).
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">B. Creative Catalog &amp; CRM Business Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              You may input details regarding your beat catalog (song titles, BPM, musical keys, tags, preview audio links, prices), customer/artist contacts entered into the Placement CRM, generated license agreements, and logged studio financial transactions.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">C. Third-Party Authentication &amp; API Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              When logging in with Google OAuth, we receive your verified Google email address, display name, and avatar URL. If you utilize the optional Mail Tracker outreach tool, we request permission to send emails and track pitch messages via Google APIs. When using the YouTube audio downloader or metadata utility, we process the public video URLs you provide.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">D. Automatically Collected Device &amp; Usage Information</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Like most cloud applications, we collect technical device logs, IP addresses, browser types, operating systems, and page navigation metrics to diagnose server issues and safeguard our network.
            </p>
          </div>
        </div>
      </section>

      {/* Prominent Google API Disclosure Section */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          3. Google API Services User Data Policy Compliance
        </h2>
        <div className="p-5 rounded-2xl border-2 border-gray-200 bg-white shadow-xs space-y-3">
          <p className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Google Limited Use Disclosure
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            BeatHelper&rsquo;s use and transfer to any other app of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-black underline hover:text-gray-700"
            >
              Google API Services User Data Policy
            </a>, including the Limited Use requirements.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600 ml-1">
            <li>We do NOT sell Google user data to any third party or marketing broker.</li>
            <li>We do NOT use Google user data for advertising purposes, retargeting, or interest-based profiling.</li>
            <li>We do NOT use Google user data to train generalized artificial intelligence (AI) or machine learning (ML) models.</li>
            <li>Human access to your Google user data is strictly prohibited unless you give explicit affirmative consent for technical support, it is required for security forensics, or is mandated by legal process.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          4. How We Use Your Information
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We process personal and studio data exclusively to deliver and enhance the BeatHelper SaaS suite:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Authentication &amp; Account Management:</strong> Validating your identity, preventing account takeovers, and administering your subscription.</li>
          <li><strong>Core SaaS Functionality:</strong> Assembling dynamic beat licensing agreements, calculating currency conversions for sales, and tracking client negotiations.</li>
          <li><strong>Outreach Management:</strong> Facilitating direct email correspondence between you and recording artists or A&amp;Rs when you initiate it.</li>
          <li><strong>Customer Support:</strong> Diagnosing errors, resolving technical issues, and responding to inquiries.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          5. Data Sharing &amp; Third-Party Service Providers
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We never monetize or sell your personal data. We only share information with trusted third-party service providers who assist in operating our infrastructure:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Supabase Inc.:</strong> Managed PostgreSQL cloud database, row-level security, and authentication infrastructure.</li>
          <li><strong>Vercel Inc.:</strong> Application hosting, edge network routing, and serverless compute.</li>
          <li><strong>Google LLC:</strong> Identity authentication (OAuth) and API endpoints.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          6. Data Security &amp; Retention
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We implement industry-standard technical and organizational security measures, including HTTPS/TLS 1.3 encryption in transit, AES-256 database encryption at rest, and strict row-level security (RLS) policies guaranteeing that only you can access your studio records.
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We retain your information as long as your account is active. If you delete your account, your profile data, beat metadata, and CRM records will be permanently purged from our primary database within 30 days.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          7. Your Privacy Rights (GDPR &amp; CCPA/CPRA)
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Depending on your location, you hold specific statutory privacy rights:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Right to Access &amp; Portability:</strong> Request an export of your personal and catalog records.</li>
          <li><strong>Right to Rectification:</strong> Edit or correct your account details directly via your Account Settings.</li>
          <li><strong>Right to Erasure (&ldquo;Right to Be Forgotten&rdquo;):</strong> Request full deletion of your account and records by emailing <span className="font-semibold text-gray-900">beatlab.space@gmail.com</span>.</li>
          <li><strong>Right to Restrict or Object to Processing:</strong> Object to specific processing activities under applicable European law.</li>
          <li><strong>Non-Discrimination:</strong> We will never discriminate against you for exercising any of your statutory privacy rights.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          8. Cookies and Web Storage
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper uses cookies and local storage tokens to preserve authentication sessions, remember UI preferences, and provide security. For comprehensive details on the types of cookies we use and how to manage them, please review our dedicated{' '}
          <Link href="/cookies" className="font-semibold text-gray-900 underline hover:text-black">
            Cookie Policy
          </Link>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          9. Children&rsquo;s Privacy
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we discover that a user under 16 has provided personal information, we will immediately delete such data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          10. Changes to This Privacy Policy
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We may update this Privacy Policy from time to time. When changes are made, we will revise the &ldquo;Last Updated&rdquo; date at the top of this page. For significant modifications, we will provide prominent notice via email or within the application dashboard.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          11. Contact Us
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact our Data Protection Officer:
        </p>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">BeatHelper Inc. — Privacy Operations</p>
          <p>Email: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
          <p>Legal: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
        </div>
      </section>
    </LegalLayout>
  );
}
