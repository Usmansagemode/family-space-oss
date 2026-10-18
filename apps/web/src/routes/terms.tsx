import { Link } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function TermsPage() {
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
        Terms of Service
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Last updated: May 14, 2026
      </p>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Family Space at{' '}
          <a
            href="https://family-space.usmankm.com"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            https://family-space.usmankm.com
          </a>
          , you agree to be bound by these Terms of Service and our{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          . If you do not agree to these terms, do not use the service.
        </p>
      </Section>

      <Section title="2. Description of Service">
        <p>
          Family Space is a shared family management platform that lets
          households organise tasks, grocery lists, and chores on a shared
          board — along with expense tracking, yearly analytics, and optional
          Google Calendar sync.
        </p>
        <p>
          The service is available on a Free plan and paid plans (Plus, Pro)
          with expanded features. Feature availability by plan is described on
          the app's pricing information.
        </p>
      </Section>

      <Section title="3. Your Account">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            You must provide accurate information when creating your account.
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your
            login credentials and for all activity under your account.
          </li>
          <li>
            You must not share your credentials or allow unauthorised access to
            your account.
          </li>
          <li>
            You must be at least 13 years old to use Family Space.
          </li>
          <li>
            Notify us immediately at{' '}
            <a
              href="mailto:usmansagemode@gmail.com"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              usmansagemode@gmail.com
            </a>{' '}
            if you suspect unauthorised use of your account.
          </li>
        </ul>
      </Section>

      <Section title="4. Family Groups & Members">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            You may create a family group and invite other users to join as
            members.
          </li>
          <li>
            All members of a family group can view and edit shared data
            (spaces, tasks, grocery items, expenses) within that group.
          </li>
          <li>
            The family owner is responsible for managing members and for all
            activity that occurs within their family group.
          </li>
          <li>
            Member limits depend on your plan (Free: up to 3, Plus: up to 5,
            Pro: unlimited).
          </li>
        </ul>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Use the service for any unlawful purpose.</li>
          <li>
            Attempt to gain unauthorised access to other users' data or to our
            systems.
          </li>
          <li>
            Interfere with or disrupt the service, its servers, or its
            infrastructure.
          </li>
          <li>
            Upload malicious files or content intended to harm other users.
          </li>
          <li>
            Reverse-engineer, decompile, or attempt to extract the source code
            of the service.
          </li>
          <li>
            Resell or sublicense access to the service without written
            permission.
          </li>
        </ul>
      </Section>

      <Section title="6. Google Sign-In & Calendar Integration">
        <p>
          Family Space allows you to sign in using your Google account via
          Google OAuth. By doing so, you authorise us to access your Google
          profile information (name, email, profile picture) in accordance with
          our{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          If you optionally connect Google Calendar, you authorise Family Space
          to create, update, and delete calendar events on your behalf — only
          for items you explicitly manage in the app. You may revoke this access
          at any time via your{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Google Account permissions
          </a>
          .
        </p>
        <p>
          Family Space's use of Google user data adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>

      <Section title="7. Your Data & Content">
        <p>
          You own all data and content you create in Family Space. We do not
          claim any ownership over your family data, expenses, or task content.
        </p>
        <p>
          You grant us a limited licence to store, process, and display your
          content solely to provide the service to you and your family members.
        </p>
        <p>
          See our{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>{' '}
          for full details on how we handle your data.
        </p>
      </Section>

      <Section title="8. Subscription & Billing">
        <p>
          Free plan features are available at no charge. Paid plans (Plus and
          Pro) require a subscription. Subscription details, pricing, and
          payment processing are managed through Stripe.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Subscriptions are billed monthly and renew automatically until
            cancelled.
          </li>
          <li>
            You may cancel your subscription at any time. Access to paid
            features continues until the end of the current billing period.
          </li>
          <li>
            We reserve the right to change pricing with reasonable notice.
            Continued use after a price change constitutes acceptance.
          </li>
          <li>Refunds are handled on a case-by-case basis.</li>
        </ul>
      </Section>

      <Section title="9. Disclaimer of Warranties">
        <p>
          Family Space is provided "as is" and "as available" without warranties
          of any kind, either express or implied. We do not warrant that the
          service will be uninterrupted, error-free, or that data will never be
          lost. Use the service at your own risk.
        </p>
      </Section>

      <Section title="10. Limitation of Liability">
        <p>
          To the fullest extent permitted by applicable law, Family Space and
          its operators shall not be liable for any indirect, incidental,
          special, exemplary, or consequential damages arising from your use
          of — or inability to use — the service, even if advised of the
          possibility of such damages.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          We reserve the right to suspend or terminate your access to the
          service at any time, with or without notice, for conduct we believe
          violates these Terms or is otherwise harmful to other users, us, or
          third parties.
        </p>
        <p>
          You may delete your account at any time from{' '}
          <strong className="text-foreground">Settings → Account → Danger Zone</strong>.
          Upon deletion, your data will be removed in accordance with our{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. We will notify you of
          material changes by updating the date above. Continued use of the
          service after changes constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section title="13. Governing Law">
        <p>
          These Terms are governed by the laws of the Province of Ontario,
          Canada. Any disputes arising from these Terms or your use of the
          service shall be resolved through good-faith negotiation before
          pursuing formal legal remedies.
        </p>
        <p>
          California residents may have additional rights under the California
          Consumer Privacy Act (CCPA) as described in our{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="14. Your Data Rights">
        <p>
          You have rights regarding the personal data we hold about you,
          including the right to access, correct, and delete your information.
          The primary way to delete your account and all associated data is{' '}
          <strong className="text-foreground">Settings → Account → Danger Zone</strong>.
          For the full description of your rights and how to exercise them, see
          our{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="15. Contact">
        <p>
          Questions about these Terms? Contact us at{' '}
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
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
