import { Link } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Back nav */}
      <Link
        to="/"
        search={{ tab: 'lists' }}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Family Space
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Last updated: May 14, 2026
      </p>

      <Section title="1. Overview">
        <p>
          Family Space ("we", "our", or "us") is a personal family management
          app available at{' '}
          <a
            href="https://family-space.usmankm.com"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            https://family-space.usmankm.com
          </a>
          . This Privacy Policy explains what data we collect, how we use it,
          and your rights regarding your information.
        </p>
        <p>
          By using Family Space, you agree to the collection and use of
          information in accordance with this policy.
        </p>
      </Section>

      <Section title="2. Data We Collect">
        <p>
          <strong className="text-foreground">Account information</strong> —
          When you sign in with Google or email, we collect your email address
          and display name. If you sign in with Google, we also receive your
          Google profile picture URL.
        </p>
        <p>
          <strong className="text-foreground">Family data</strong> — Content
          you create in the app: spaces, tasks, grocery items, chores, and
          expense records. This data is associated with your family account and
          is accessible to other members of your family group.
        </p>
        <p>
          <strong className="text-foreground">Google Calendar data</strong> —
          If you optionally connect Google Calendar, we access calendar events
          solely to create, update, and delete events that correspond to tasks
          you explicitly assign a date to in Family Space. We do not read,
          store, or process any other calendar data.
        </p>
        <p>
          <strong className="text-foreground">Usage data</strong> — Basic
          server-side logs (timestamps, request paths) retained briefly for
          debugging. We do not track individual user behaviour.
        </p>
      </Section>

      <Section title="3. Google OAuth Scopes">
        <p>
          When you sign in with Google, Family Space requests the following
          scopes:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              openid
            </code>
            ,{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">email</code>
            ,{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              profile
            </code>{' '}
            — to authenticate your identity and display your name and avatar.
          </li>
        </ul>
        <p>
          If you optionally connect Google Calendar (in Settings), we
          additionally request:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              https://www.googleapis.com/auth/calendar.events
            </code>{' '}
            — to create, update, and delete calendar events for items you
            manage in the app. This scope is only requested at the time you
            enable the integration.
          </li>
        </ul>
      </Section>

      <Section title="4. Google API Services — Limited Use Disclosure">
        <p>
          Family Space's use of information received from Google APIs adheres
          to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Google API Services User Data Policy
          </a>
          , including the <strong className="text-foreground">Limited Use</strong>{' '}
          requirements. Specifically:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Google user data is used only to provide and improve the features
            described in this Privacy Policy and visible to you when you grant
            access.
          </li>
          <li>
            Google user data is not transferred to third parties except as
            necessary to provide the service (e.g., storing your email in
            Supabase for authentication).
          </li>
          <li>
            Google user data is <strong className="text-foreground">not</strong>{' '}
            used for advertising or marketing purposes.
          </li>
          <li>
            Google user data is{' '}
            <strong className="text-foreground">not</strong> used to train
            machine-learning or AI models.
          </li>
          <li>
            Humans at Family Space do{' '}
            <strong className="text-foreground">not</strong> read your Google
            Calendar data unless you explicitly report a bug and request
            assistance.
          </li>
        </ul>
      </Section>

      <Section title="5. How We Use Your Data">
        <ul className="list-disc space-y-2 pl-6">
          <li>To authenticate you and maintain your account session.</li>
          <li>
            To store and display your family data across devices and family
            members.
          </li>
          <li>
            To sync calendar events when you set a date on a task (Google
            Calendar integration only, when enabled).
          </li>
          <li>
            To send family-member invitation emails when you invite someone to
            your family group.
          </li>
          <li>
            To process bank statement files through Google Gemini AI when you
            use the PDF import feature (Pro plan). The file content is sent to
            Gemini for extraction only and is not retained by Gemini or by us
            after the import session ends.
          </li>
        </ul>
        <p>
          We do <strong className="text-foreground">not</strong> sell, rent, or
          share your personal data with third-party advertisers or data brokers.
        </p>
      </Section>

      <Section title="6. Data Storage & Security">
        <p>
          Your data is stored in Supabase (PostgreSQL, hosted on AWS). We
          enforce row-level security (RLS) policies so each family can only
          access their own data. All data is transmitted over HTTPS/TLS. Your
          data is also encrypted at rest on AWS-managed infrastructure
          (AES-256 disk encryption).
        </p>
        <p>
          While we take reasonable security measures, no system is 100% secure.
          If you suspect unauthorised access to your account, contact us
          immediately. In the event of a data breach affecting your personal
          information, we will notify affected users within 30 days as required
          by applicable law.
        </p>
      </Section>

      <Section title="7. Data Retention">
        <p>
          Your data is retained for as long as your account is active. If you
          delete your account, we will delete your personal data and family data
          within 30 days, except where we are required to retain it for legal
          purposes.
        </p>
        <p>
          You can delete your account at any time from{' '}
          <strong className="text-foreground">Settings → Account → Danger Zone</strong>.
          If you are unable to access your account, email us at{' '}
          <a
            href="mailto:usmansagemode@gmail.com"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            usmansagemode@gmail.com
          </a>{' '}
          and we will process the deletion request manually.
        </p>
      </Section>

      <Section title="8. Your Rights (CCPA &amp; PIPEDA)">
        <p>
          Depending on where you live, you may have the following rights
          regarding your personal information:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-foreground">Right to access</strong> — You
            may request a copy of the personal data we hold about you.
          </li>
          <li>
            <strong className="text-foreground">Right to deletion</strong> — You
            may request that we delete your personal data. The primary way to
            exercise this right is{' '}
            <strong className="text-foreground">Settings → Account → Danger Zone</strong>.
            Alternatively, email us and we will process it manually within 30 days.
          </li>
          <li>
            <strong className="text-foreground">Right to correction</strong> —
            You may update your display name and profile picture directly within
            the app (Settings → Account). For other corrections, contact us by
            email.
          </li>
          <li>
            <strong className="text-foreground">No sale of data</strong> — We do
            not sell, rent, or share your personal data with third-party
            advertisers or data brokers, and we never will.
          </li>
        </ul>
        <p>
          To exercise any of these rights, use the in-app options above or
          contact us at{' '}
          <a
            href="mailto:usmansagemode@gmail.com"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            usmansagemode@gmail.com
          </a>
          . We will respond within 30 days.
        </p>
      </Section>

      <Section title="9. Revoking Google Access">
        <p>
          You may revoke Family Space's access to your Google account at any
          time by visiting{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            myaccount.google.com/permissions
          </a>{' '}
          and removing Family Space. Revoking access will sign you out of the
          app. Any calendar events previously synced will remain in your Google
          Calendar.
        </p>
      </Section>

      <Section title="10. Third-Party Services">
        <p>
          Family Space uses the following sub-processors to operate the service:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-foreground">Supabase</strong> — database,
            authentication, and file storage.
          </li>
          <li>
            <strong className="text-foreground">Google</strong> — authentication
            (Google Sign-In) and optional Calendar integration.
          </li>
          <li>
            <strong className="text-foreground">Google Gemini</strong> — AI
            processing for PDF bank statement imports (Pro plan only, on demand).
          </li>
        </ul>
        <p>
          Each of these services has its own privacy policy. We are not
          responsible for their data practices.
        </p>
      </Section>

      <Section title="11. Children's Privacy">
        <p>
          Family Space is not directed at children under 13. We do not knowingly
          collect personal information from children under 13. If you believe we
          have inadvertently collected such data, please contact us and we will
          delete it promptly.
        </p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>
          We may update this policy occasionally. We will notify you of
          significant changes by updating the date at the top of this page.
          Continued use of the service after changes constitutes acceptance of
          the updated policy.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          For privacy questions, data deletion requests, or to report a concern,
          contact us at{' '}
          <a
            href="mailto:usmansagemode@gmail.com"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            usmansagemode@gmail.com
          </a>
          .
        </p>
      </Section>

      <div className="mt-12 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>
          See also:{' '}
          <Link
            to="/terms"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  )
}
