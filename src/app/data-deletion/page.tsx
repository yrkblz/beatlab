import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import Link from 'next/link';
import { Trash2, ShieldCheck, Mail, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'User Data Deletion Instructions | BeatHelper',
  description:
    'Step-by-step instructions for deleting your personal data, connected social accounts (Meta/Instagram, Google, TikTok), and studio records from BeatHelper.',
};

export default function DataDeletionPage() {
  return (
    <LegalLayout
      title="User Data Deletion Instructions"
      subtitle="Clear and transparent instructions on how you can request the erasure of your personal data, CRM leads, and connected third-party platform credentials (Meta / Instagram, Google, and TikTok)."
      lastUpdated="October 28, 2026"
      activeTab="data-deletion"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          1. Overview and Our Commitment to Your Privacy
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          At BeatHelper Inc. (&ldquo;BeatHelper&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), we take your privacy and control over your personal data seriously. In accordance with the General Data Protection Regulation (GDPR Article 17 &ldquo;Right to be Forgotten&rdquo;), the California Consumer Privacy Act (CCPA/CPRA), and the Platform Developer Terms of Google, Meta (Facebook &amp; Instagram), and TikTok, all users have the absolute right to request the permanent deletion of their account, creative catalog records, and any personal information collected or cached by BeatHelper.
        </p>
      </section>

      {/* Meta / Instagram Data Deletion Instructions */}
      <section id="meta-instagram-deletion" className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-pink-100 text-pink-700">
            <Trash2 size={20} aria-hidden="true" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            2. Meta &amp; Instagram Platform Data Deletion Instructions
          </h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you connected your Instagram account or utilized BeatHelper&rsquo;s Lead Scout and CRM tools to organize public artist profiles and outreach interactions, you can easily remove our platform permissions and request the immediate deletion of all cached Instagram data through either of the methods below:
        </p>

        <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/60 space-y-4">
          <h3 className="font-semibold text-gray-900 text-base">
            Method A: Revoke Permissions in Facebook / Instagram Settings
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            As required by Meta Platform Policy, you can disconnect BeatHelper from your Meta accounts at any time:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 ml-2">
            <li>Log into your <strong>Facebook</strong> or <strong>Instagram</strong> account.</li>
            <li>Go to <strong>Settings &amp; Privacy</strong> &gt; <strong>Settings</strong>.</li>
            <li>In the left menu, select <strong>Apps and Websites</strong> (or <strong>Permissions and Partner Apps</strong> on Instagram).</li>
            <li>Locate <strong>BeatHelper</strong> (or <strong>BeatLab</strong>) in the list of authorized applications.</li>
            <li>Click <strong>Remove</strong> to revoke all platform access.</li>
            <li>Confirm by clicking <strong>Remove</strong> again to revoke all stored tokens and permissions.</li>
          </ol>
        </div>

        <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/60 space-y-4">
          <h3 className="font-semibold text-gray-900 text-base">
            Method B: Direct Request to Purge Cached Instagram Data
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            To delete all Instagram handles, cached public profiles, and outreach notes associated with your account:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-700 ml-2">
            <li>
              Send an email to{' '}
              <a href="mailto:beatlab.space@gmail.com?subject=Meta%2FInstagram%20Data%20Deletion%20Request" className="font-semibold text-black underline">
                beatlab.space@gmail.com
              </a>{' '}
              with the subject line: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-900">Instagram Data Deletion Request</code>.
            </li>
            <li>Include your registered BeatHelper email address and any Instagram username you wish purged from our cache.</li>
            <li>Our compliance team will execute a hard delete of all matching records in our Supabase database within <strong>30 calendar days</strong> and send you a formal confirmation email.</li>
          </ul>
        </div>
      </section>

      {/* Google API Data Deletion & Revocation */}
      <section id="google-deletion" className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            3. Google Account &amp; Google API Data Deletion
          </h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper requests access to Google APIs exclusively for user-initiated email delivery (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">gmail.send</code>) and audio attachment picking (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">drive.readonly</code>). We do NOT store your emails, drive files, or contacts on our permanent servers.
        </p>
        <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/60 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">How to Revoke Google Access Instantly:</h3>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 ml-2">
            <li>
              Open your Google Account permissions page at{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-black underline inline-flex items-center gap-1"
              >
                myaccount.google.com/permissions <ExternalLink size={12} aria-hidden="true" />
              </a>.
            </li>
            <li>Find <strong>BeatHelper</strong> under &ldquo;Third-party apps with account access&rdquo;.</li>
            <li>Click <strong>Delete all connections that you have with BeatHelper</strong> and confirm.</li>
            <li>Upon revocation, all active Google OAuth tokens stored locally in your browser storage (<code className="bg-gray-200 px-1 py-0.5 rounded text-xs">beatlab_google_provider_token</code>) are instantly invalidated.</li>
          </ol>
        </div>
      </section>

      {/* TikTok API Data Deletion */}
      <section id="tiktok-deletion" className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-neutral-900 text-white">
            <RefreshCw size={20} aria-hidden="true" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            4. TikTok Developer Platform Data Deletion
          </h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you utilize TikTok features within BeatHelper (such as sound tracking, placement discovery, or creator analytics), you can revoke access and delete cached TikTok data at any time:
        </p>
        <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/60 space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 ml-2">
            <li>Open the <strong>TikTok app</strong> on your mobile device or log into <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">tiktok.com</a>.</li>
            <li>Go to <strong>Profile</strong> &gt; <strong>Settings and privacy</strong> &gt; <strong>Security &amp; permissions</strong>.</li>
            <li>Select <strong>Manage app permissions</strong>.</li>
            <li>Tap <strong>BeatHelper</strong> and select <strong>Remove Access</strong>.</li>
            <li>To purge any cached video links or sound analytics stored in your CRM campaigns, email <a href="mailto:beatlab.space@gmail.com" className="font-semibold text-black underline">beatlab.space@gmail.com</a> with subject &ldquo;TikTok Data Deletion&rdquo;. All associated records will be purged within 30 days.</li>
          </ol>
        </div>
      </section>

      {/* Complete Account Purge */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          5. Complete Account Deletion &amp; Data Erasure (Self-Service)
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You can delete your entire BeatHelper account and all associated data at any time without contacting support:
        </p>
        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 ml-2">
            <li>Log into your account and navigate to <Link href="/account" className="font-semibold text-black underline">Account Settings</Link>.</li>
            <li>Scroll down to the <strong>Danger Zone</strong> section at the bottom of the page.</li>
            <li>Click <strong>Delete Account &amp; Purge All Studio Data</strong>.</li>
            <li>Confirm the prompt. Your user record, catalog beats, sales logs, client contacts, and email records will be immediately erased from our live database.</li>
          </ol>
        </div>
      </section>

      {/* Retention Schedule and Verification */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          6. Deletion Timeline and Verification
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Upon receiving an account deletion request or an API data deletion notification:
        </p>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-gray-600 ml-2">
          <li><strong>Live Database:</strong> Your user profile, beat records, CRM contacts, and third-party tokens are permanently deleted from Supabase within <strong>24 hours</strong>.</li>
          <li><strong>Encrypted Backups:</strong> System disaster recovery snapshots that contain encrypted database backups are automatically overwritten and purged on a rolling <strong>30-day retention schedule</strong>.</li>
          <li><strong>Confirmation:</strong> If you requested deletion via email, our Data Protection team will send you a formal confirmation certificate once the purge is fully finalized.</li>
        </ul>
      </section>

      {/* Contact Section */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          7. Questions &amp; Data Protection Officer Contact
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you have any questions about this Data Deletion Policy or require assistance erasing specific data, please contact our Data Protection Officer:
        </p>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">BeatHelper Inc. — Privacy &amp; Data Deletion Office</p>
          <p>Email: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
          <p>Subject Tag: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-900">Data Deletion Request</code></p>
          <p className="text-xs text-gray-500 mt-2">Response time: Typically within 24 to 48 business hours.</p>
        </div>
      </section>
    </LegalLayout>
  );
}
