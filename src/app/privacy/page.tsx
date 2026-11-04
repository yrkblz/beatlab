import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import Link from 'next/link';
import { ExternalLink, ShieldCheck, Lock, RefreshCw, Trash2, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | BeatHelper',
  description:
    'BeatHelper Privacy Policy: learn how we collect, protect, and handle producer account data, third-party integrations (Google, Meta/Instagram, TikTok), and Google API user data.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How BeatHelper collects, handles, stores, and protects your personal data, creative studio records, and third-party API integrations."
      lastUpdated="October 28, 2026"
      activeTab="privacy"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          1. Introduction
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          At BeatHelper Inc. (&ldquo;BeatHelper&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), we respect your privacy and are committed to safeguarding your personal information. This Privacy Policy outlines what information we collect when you visit our website, use our SaaS web application, and interact with our integrated producer tools, and explains how we process, store, and protect that data in accordance with applicable privacy regulations, including the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), and the developer policies of Google, Meta (Instagram), and TikTok.
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
              When creating an account or updating your profile, we collect your full legal name, producer / stage name, email address, physical studio address (used for generating legally binding beat contracts and split sheets), and your default studio base currency (e.g., USD, EUR, PLN, GBP).
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">B. Creative Catalog &amp; CRM Business Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              You may input details regarding your beat catalog (song titles, BPM, musical keys, tags, preview audio links, prices), customer/artist contacts entered into the Placement CRM, generated license agreements, and logged studio financial transactions.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">C. Google API Services &amp; User Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              When logging in via Google OAuth, we receive your verified Google email address, display name, and avatar URL. If you utilize our Mailer outreach tool, you may grant permission for user-directed email sending (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">gmail.send</code>) and selecting Google Drive audio stems (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">drive.readonly</code>). Specific protections governing this data are detailed in Section 3 below.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">D. Meta &amp; Instagram Platform Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              When you use our Lead Scout or CRM utilities to track artist outreach, we process publicly available Instagram data (such as public usernames, profile links, public bios, and follower counts) and user-supplied interaction notes. We do NOT collect private direct messages or passwords.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">E. TikTok Platform &amp; Sound Analytics Data</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              If you link TikTok features or track audio placements, we may process public creator usernames, video URLs, and publicly available sound analytics for the purpose of monitoring beat placements and viral audio trends.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">F. Automatically Collected Device &amp; Usage Information</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Like most cloud applications, we collect technical device logs, IP addresses, browser types, operating systems, and page navigation metrics to diagnose server issues, detect fraudulent access, and safeguard our network.
            </p>
          </div>
        </div>
      </section>

      {/* Prominent Google API Disclosure Section */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          3. Google API Services User Data Policy Compliance
        </h2>
        <div className="p-5 rounded-2xl border-2 border-gray-900 bg-white shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-600" aria-hidden="true" />
            <p className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
              Google Limited Use Disclosure
            </p>
          </div>

          <p className="text-sm text-gray-800 leading-relaxed font-medium">
            BeatHelper&rsquo;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-black underline hover:text-gray-700 inline-flex items-center gap-1"
            >
              Google API Services User Data Policy <ExternalLink size={13} aria-hidden="true" />
            </a>, including the Limited Use requirements.
          </p>

          <div className="space-y-2 border-t border-gray-200 pt-3">
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">Specific Scopes Requested and How They Are Used:</h3>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-gray-600 ml-1">
              <li>
                <strong>https://www.googleapis.com/auth/gmail.send (Gmail API):</strong> We use this sensitive scope solely to send outbound beat pitch emails, collaboration messages, and stems to artists or A&amp;Rs at the user&rsquo;s explicit direction. BeatHelper does <em>not</em> read your personal inbox, does <em>not</em> index private conversations, and does <em>not</em> download email history.
              </li>
              <li>
                <strong>https://www.googleapis.com/auth/drive.readonly (Google Drive API):</strong> We use this scope solely to allow producers to select and attach their beat audio bounces, mp3/wav files, or zipped trackout stems stored in their personal Google Drive without manually re-uploading large files. BeatHelper does <em>not</em> modify, delete, or create files on your Google Drive, and accesses only the specific files you explicitly select for attachment.
              </li>
              <li>
                <strong>openid, email, profile:</strong> Used solely to authenticate your identity and display your producer email and avatar in your Account Settings.
              </li>
            </ul>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-3">
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">Strict Google Data Protections:</h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600 ml-1">
              <li>We do NOT sell Google user data to any third party, data broker, or marketing entity.</li>
              <li>We do NOT use Google user data for advertising purposes, retargeting, or interest-based behavioral profiling.</li>
              <li>We do NOT use Google user data to train generalized artificial intelligence (AI) or machine learning (ML) models.</li>
              <li>Human access to your Google user data is strictly prohibited unless you provide explicit affirmative consent for customer support, it is necessary to investigate security incidents, or is mandated by applicable legal process.</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 text-blue-950 text-xs sm:text-sm">
            <strong>Revoking Google Permissions:</strong> You can revoke BeatHelper&rsquo;s access to your Google account at any time by visiting your Google Account Security Settings at{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-blue-900"
            >
              https://myaccount.google.com/permissions
            </a>.
          </div>
        </div>
      </section>

      {/* Meta / Instagram Platform Policy Compliance */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          4. Meta &amp; Instagram Platform Data Compliance
        </h2>
        <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            BeatHelper complies with the <strong>Meta Platform Terms</strong> and <strong>Developer Policies</strong>. When our services interact with Meta products or Instagram services:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-gray-600 ml-1">
            <li><strong>Purpose Limitation:</strong> We process Instagram public profile details (such as usernames, public bio summaries, follower counts) solely to assist music producers in managing their direct outreach and artist networking pipelines within our CRM.</li>
            <li><strong>No Sale or Surveillance:</strong> We do NOT sell, transfer, or license Instagram platform data to third parties, data brokers, or advertising networks, and we strictly prohibit using this data for surveillance.</li>
            <li><strong>User Privacy &amp; Consent:</strong> We do not attempt to bypass Instagram privacy settings or access private profile information without authorization.</li>
            <li><strong>Data Deletion:</strong> Users have the right to request the immediate erasure of any cached Instagram profile data or leads. Detailed step-by-step instructions are provided in <Link href="/data-deletion#meta-instagram-deletion" className="font-semibold text-black underline">Section 9 below and on our dedicated Data Deletion page</Link>.</li>
          </ul>
        </div>
      </section>

      {/* TikTok Platform Compliance */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          5. TikTok Developer Platform Compliance
        </h2>
        <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            BeatHelper complies with the <strong>TikTok Developer Terms of Service</strong> and <strong>Partner Policies</strong>:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-gray-600 ml-1">
            <li><strong>Audio Placement Tracking:</strong> TikTok public audio identifiers, video links, or creator handles are processed solely to help producers discover where their beats and sounds are placed or trending on TikTok.</li>
            <li><strong>No Commercial Profiling:</strong> TikTok platform data is never utilized for automated credit scoring, discriminatory profiling, or behavioral advertising.</li>
            <li><strong>Revocation &amp; Deletion:</strong> You can disconnect TikTok from BeatHelper at any time within your TikTok mobile app (<code className="bg-gray-100 px-1 py-0.5 rounded text-xs">Profile &gt; Settings &gt; Security &gt; Manage app permissions</code>) or by contacting our support team.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          6. How We Use Your Information
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We process personal and studio data exclusively to deliver and enhance the BeatHelper SaaS suite:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Authentication &amp; Account Management:</strong> Validating your identity, preventing account takeovers, and administering your subscription.</li>
          <li><strong>Core SaaS Functionality:</strong> Assembling dynamic beat licensing agreements, calculating currency conversions for sales, and tracking client negotiations.</li>
          <li><strong>Outreach Management:</strong> Facilitating direct email correspondence between you and recording artists or A&amp;Rs when you initiate it via connected Google accounts.</li>
          <li><strong>Customer Support:</strong> Diagnosing errors, resolving technical issues, and responding to inquiries.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          7. Data Sharing &amp; Third-Party Service Providers
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We never monetize or sell your personal data. We only share information with trusted third-party service providers who assist in operating our secure infrastructure:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Supabase Inc.:</strong> Managed PostgreSQL cloud database, row-level security (RLS), and authentication infrastructure.</li>
          <li><strong>Vercel Inc.:</strong> Application hosting, edge network routing, and serverless compute.</li>
          <li><strong>Google LLC:</strong> Identity authentication (OAuth) and API endpoints (Gmail sending and Google Drive file attachments).</li>
          <li><strong>Stripe Inc.:</strong> Payment processing, PCI-DSS compliant subscription billing, and invoice generation.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          8. Data Security &amp; Storage Safeguards
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We implement industry-standard technical and organizational security measures, including HTTPS/TLS 1.3 encryption in transit, AES-256 database encryption at rest, and strict PostgreSQL Row-Level Security (RLS) policies guaranteeing that only you can access your catalog and client records.
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          OAuth access tokens for third-party integrations (such as Google API access) are stored securely in encrypted session storage and browser local storage, and can be invalidated at any moment by logging out or revoking access.
        </p>
      </section>

      {/* Meta Mandatory: User Data Deletion Instructions */}
      <section id="data-deletion" className="space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 size={22} className="text-red-600" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            9. Data Retention &amp; User Data Deletion Instructions
          </h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We retain your information as long as your account is active. In accordance with Meta Platform Policy and GDPR Article 17, we provide clear mechanisms for users to request data erasure:
        </p>
        
        <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">How to Delete Your Data:</h3>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 ml-1">
            <li>
              <strong>Self-Service Account Deletion:</strong> You can permanently delete your entire account, beat catalog, financial sales, and CRM leads by navigating to <Link href="/account" className="font-semibold text-black underline">Account Settings</Link> and clicking <strong>&ldquo;Delete Account &amp; Purge All Studio Data&rdquo;</strong>.
            </li>
            <li>
              <strong>Meta / Instagram Data Purge:</strong> To specifically delete cached Instagram leads or revoke Facebook/Instagram permissions, follow the instructions in our dedicated{' '}
              <Link href="/data-deletion" className="font-semibold text-black underline">
                User Data Deletion Instructions page
              </Link>{' '}
              or email us directly.
            </li>
            <li>
              <strong>Direct Support Request:</strong> You can submit a deletion request by emailing{' '}
              <a href="mailto:beatlab.space@gmail.com" className="font-semibold text-black underline">
                beatlab.space@gmail.com
              </a>{' '}
              with the subject &ldquo;Data Deletion Request&rdquo;. All associated personal and platform data will be purged within <strong>30 days</strong>.
            </li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          10. Your Privacy Rights (GDPR &amp; CCPA/CPRA)
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Depending on your location, you hold specific statutory privacy rights:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-600 ml-2">
          <li><strong>Right to Access &amp; Portability:</strong> Request an export of your personal and catalog records.</li>
          <li><strong>Right to Rectification:</strong> Edit or correct your account details directly via your Account Settings.</li>
          <li><strong>Right to Erasure (&ldquo;Right to Be Forgotten&rdquo;):</strong> Request full deletion of your account and records by emailing <span className="font-semibold text-gray-900">beatlab.space@gmail.com</span> or via <Link href="/data-deletion" className="underline font-medium text-black">/data-deletion</Link>.</li>
          <li><strong>Right to Restrict or Object to Processing:</strong> Object to specific processing activities under applicable European law.</li>
          <li><strong>Non-Discrimination:</strong> We will never discriminate against you for exercising any of your statutory privacy rights.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          11. Cookies and Web Storage
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper uses essential cookies and local storage tokens to preserve authentication sessions, remember UI preferences, and provide security. For comprehensive details on the types of cookies we use and how to manage them, please review our dedicated{' '}
          <Link href="/cookies" className="font-semibold text-gray-900 underline hover:text-black">
            Cookie Policy
          </Link>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          12. Children&rsquo;s Privacy
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we discover that a user under 16 has provided personal information, we will immediately delete such data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          13. Changes to This Privacy Policy
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We may update this Privacy Policy from time to time to maintain compliance with legal developments and platform partner policies. When changes are made, we will revise the &ldquo;Last Updated&rdquo; date at the top of this page. For significant modifications, we will provide prominent notice via email or within the application dashboard.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          14. Contact Us
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact our Data Protection Officer:
        </p>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">BeatHelper Inc. — Privacy &amp; Compliance Operations</p>
          <p>Email: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
          <p>Legal Inquiries: <a href="mailto:beatlab.space@gmail.com" className="text-black underline font-medium">beatlab.space@gmail.com</a></p>
          <p>Data Deletion Portal: <Link href="/data-deletion" className="text-black underline font-medium">https://beatlab.space/data-deletion</Link></p>
        </div>
      </section>
    </LegalLayout>
  );
}
