import type { Metadata } from "next";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Cookie Policy — SpeedIQ",
  description:
    "What cookies and similar technologies SpeedIQ uses, and how you can control them.",
  alternates: { canonical: "/legal/cookies" },
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      lastUpdated="May 12, 2026"
      intro="This Cookie Policy explains what cookies and similar technologies SpeedIQ uses, what they do, and how you can control them."
    >
      <LegalSection title="1. What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a
          website. They help websites remember you, your preferences, and your
          activity. Similar technologies include local storage, session
          storage, and pixels.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use cookies">
        <p>
          SpeedIQ uses cookies and similar technologies for the following
          purposes:
        </p>
        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-white">
          Strictly necessary cookies
        </h3>
        <p>
          Required for the Services to function. These cannot be disabled
          without breaking the site:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Authentication.</strong> Supabase session cookies that keep you signed in.</li>
          <li><strong>Active project.</strong> Cookie storing the currently selected project so we can route you correctly across the dashboard.</li>
          <li><strong>CSRF protection.</strong> Tokens that protect form submissions from cross-site request forgery.</li>
          <li><strong>Theme preference.</strong> Local storage entry remembering your light/dark mode selection.</li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-white">
          Functional storage
        </h3>
        <p>
          Improves the experience by remembering your preferences:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>UI preferences such as sidebar collapse state.</li>
          <li>Inbox filters and last-visited conversation.</li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-white">
          Analytics
        </h3>
        <p>
          We use minimal first-party analytics (page views, feature usage,
          performance) to operate and improve the Services. These are
          aggregated and do not personally identify individual visitors.
        </p>

        <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-white">
          Third-party cookies
        </h3>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Stripe.</strong> Cookies set during checkout for fraud detection and payment flow. See the <a href="https://stripe.com/cookies-policy/legal" rel="noopener noreferrer" target="_blank" className="text-zinc-900 underline dark:text-white">Stripe cookie policy</a>.</li>
          <li><strong>Supabase.</strong> Auth cookies for session management.</li>
          <li><strong>Vercel.</strong> Optional analytics cookies if enabled.</li>
        </ul>
        <p>
          We do not use cross-context behavioural advertising cookies. We do
          not sell information collected via cookies.
        </p>
      </LegalSection>

      <LegalSection title="3. Geolocation by IP">
        <p>
          On marketing pages, we read your country code from a server-provided
          header (e.g., Vercel&apos;s geo header) to display prices in the
          appropriate currency (₹ for India, $ elsewhere). This is a one-shot
          read at request time and is not stored as a cookie.
        </p>
      </LegalSection>

      <LegalSection title="4. Controlling cookies">
        <p>
          Most browsers let you view, block, and delete cookies via their
          settings menus. Disabling strictly necessary cookies may break parts
          of the Services. Disabling functional and analytics cookies will not
          break core functionality.
        </p>
        <p>
          To clear cookies and local storage for our domain, use your
          browser&apos;s site-data tools. Specific instructions:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><a href="https://support.google.com/chrome/answer/95647" rel="noopener noreferrer" target="_blank" className="text-zinc-900 underline dark:text-white">Google Chrome</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" rel="noopener noreferrer" target="_blank" className="text-zinc-900 underline dark:text-white">Safari</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" rel="noopener noreferrer" target="_blank" className="text-zinc-900 underline dark:text-white">Firefox</a></li>
          <li><a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" rel="noopener noreferrer" target="_blank" className="text-zinc-900 underline dark:text-white">Microsoft Edge</a></li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Updates">
        <p>
          We may update this Cookie Policy to reflect changes in technology or
          regulation. Material updates will be reflected in the &ldquo;Last
          updated&rdquo; date at the top of this page.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          Cookie or privacy questions:{" "}
          <a
            href="mailto:privacy@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            privacy@speediq.app
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
