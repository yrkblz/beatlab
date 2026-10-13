import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy | BeatHelper',
  description:
    'Learn about how BeatHelper uses cookies, local storage, and session tokens to provide secure music producer software tools.',
};

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="Clear and transparent information about the cookies, tokens, and web storage technologies utilized on BeatHelper."
      lastUpdated="October 10, 2026"
      activeTab="cookies"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          1. What Are Cookies and Local Storage?
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Cookies are small text files placed on your device (computer, tablet, or smartphone) by websites that you visit. They are widely used to make web applications function efficiently, secure user logins, and preserve user preferences across browsing sessions.
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          In addition to standard HTTP cookies, BeatHelper utilizes HTML5 Web Storage (&ldquo;Local Storage&rdquo;) to store user interface states and consent selections locally within your browser, ensuring fast and reliable performance without transmitting superfluous data on every network request.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          2. How BeatHelper Uses Cookies
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          BeatHelper takes a minimalist, privacy-focused approach. We do not use third-party behavioral advertising cookies or cross-site tracking pixels. The technologies we use fall into two primary categories:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">
              Strictly Necessary (Essential)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Required for basic operation, authentication, and security. They verify your session token, protect against cross-site request forgery (CSRF), and remember your cookie consent preferences. Without these, the application cannot function properly.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">
              Functional &amp; Preferences
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Allow BeatHelper to remember your studio configuration choices (such as preferred base currency, UI filtering parameters, and sidebar layout status) so you don&rsquo;t have to reconfigure them each time you navigate the platform.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          3. Detailed Cookie &amp; Storage Inventory
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          The following table outlines the key cookies and local storage tokens utilized by the BeatHelper application:
        </p>

        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 font-semibold">
              <tr>
                <th scope="col" className="py-3 px-4">Key / Identifier</th>
                <th scope="col" className="py-3 px-4">Type</th>
                <th scope="col" className="py-3 px-4">Provider</th>
                <th scope="col" className="py-3 px-4">Purpose</th>
                <th scope="col" className="py-3 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-gray-900">sb-*-auth-token</td>
                <td className="py-3 px-4">Essential Cookie</td>
                <td className="py-3 px-4">Supabase</td>
                <td className="py-3 px-4">Secure JWT authentication token maintaining producer login session.</td>
                <td className="py-3 px-4">Session / 1 Year</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-gray-900">beathelper_cookie_consent</td>
                <td className="py-3 px-4">Essential Storage</td>
                <td className="py-3 px-4">BeatHelper</td>
                <td className="py-3 px-4">Remembers that you acknowledged the cookie consent banner to avoid re-prompting.</td>
                <td className="py-3 px-4">Persistent</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-gray-900">__Host-GAPS / Google Auth</td>
                <td className="py-3 px-4">Third-Party Cookie</td>
                <td className="py-3 px-4">Google LLC</td>
                <td className="py-3 px-4">Used during Google Single-Sign-On authentication to verify identity safely.</td>
                <td className="py-3 px-4">Session / 2 Years</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-gray-900">studio_preferences</td>
                <td className="py-3 px-4">Functional Storage</td>
                <td className="py-3 px-4">BeatHelper</td>
                <td className="py-3 px-4">Caches default studio filters, table column widths, and display settings.</td>
                <td className="py-3 px-4">Persistent</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          4. Managing and Disabling Cookies
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Most modern web browsers allow you to manage cookie settings, including viewing stored cookies, blocking third-party cookies, or rejecting cookies entirely.
        </p>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          You can configure your browser preferences via the following official support guides:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600 ml-2">
          <li><strong>Google Chrome:</strong> Settings &gt; Privacy and security &gt; Third-party cookies</li>
          <li><strong>Mozilla Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data</li>
          <li><strong>Apple Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data</li>
          <li><strong>Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies</li>
        </ul>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-900 text-xs sm:text-sm leading-relaxed mt-2">
          <strong>Please Note:</strong> Blocking strictly necessary cookies (such as Supabase authentication session tokens) will prevent you from signing in to BeatHelper and accessing your studio dashboard.
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          5. Updates to This Cookie Policy
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          We may update this Cookie Policy periodically to reflect technological adjustments, new software features, or regulatory standards. Any modifications will take effect immediately upon posting with an updated &ldquo;Last Updated&rdquo; date.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          6. Contact Us
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          If you have any questions or require additional details regarding our use of cookies and tracking technologies, please feel free to reach out to us:
        </p>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">BeatHelper Inc. — Privacy &amp; Data Compliance</p>
          <p>Email: <a href="mailto:privacy@beathelper.com" className="text-black underline font-medium">privacy@beathelper.com</a></p>
          <p>Legal: <a href="mailto:legal@beathelper.com" className="text-black underline font-medium">legal@beathelper.com</a></p>
        </div>
      </section>
    </LegalLayout>
  );
}
