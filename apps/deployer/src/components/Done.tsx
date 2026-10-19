import { useEffect, useRef } from 'react'
import { ExternalLink as ExternalIcon, PartyPopper } from 'lucide-react'

import { ExternalLink } from '#/components/Field'
import { buttonVariants } from '#/components/ui/button'

const DOCS = 'https://github.com/Usmansagemode/family-space-oss/blob/main/docs'

export function Done({
  appUrl,
  ownerEmail,
  ownerExisted,
  reused,
}: {
  appUrl: string
  ownerEmail: string
  ownerExisted: boolean
  reused: boolean
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-xl font-semibold outline-none"
        >
          <PartyPopper aria-hidden className="text-primary size-6" /> Your
          Family Space is live
        </h2>
        <p className="break-all">
          <a
            href={appUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium"
          >
            {appUrl}
          </a>
        </p>
        <p className="text-muted-foreground text-sm">
          Sign in as{' '}
          <strong className="text-foreground break-all">{ownerEmail}</strong>.
          {!reused &&
            ' The first sign-in makes you the owner and starts setup.'}
          {ownerExisted &&
            ' This account already existed, so its password was left unchanged.'}
        </p>
      </div>

      <section
        aria-labelledby="migrating"
        className="border-primary/40 space-y-1 rounded-md border p-4 text-sm"
      >
        <h3 id="migrating" className="font-semibold">
          Migrating from family-space? Don&apos;t sign in yet.
        </h3>
        <p className="text-muted-foreground">
          Signing in first creates an empty family. Move your data before anyone
          signs in:{' '}
          <ExternalLink href={`${DOCS}/migrating-from-family-space.md`}>
            migration runbook
          </ExternalLink>
          .
        </p>
      </section>

      <section aria-labelledby="next" className="space-y-2 text-sm">
        <h3 id="next" className="font-semibold">
          Next steps
        </h3>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            Delete the tokens you made for this deploy:{' '}
            <ExternalLink href="https://supabase.com/dashboard/account/tokens">
              Supabase tokens
            </ExternalLink>{' '}
            and{' '}
            <ExternalLink href="https://vercel.com/account/settings/tokens">
              Vercel tokens
            </ExternalLink>
            .
          </li>
          <li>
            Add family members:{' '}
            <ExternalLink
              href={`${DOCS}/self-hosting.md#adding-family-members`}
            >
              how to
            </ExternalLink>
            .
          </li>
          <li>
            Optional: turn on &quot;Continue with Google&quot;:{' '}
            <ExternalLink
              href={`${DOCS}/self-hosting.md#google-sign-in-optional`}
            >
              Google sign-in setup
            </ExternalLink>
            .
          </li>
        </ul>
      </section>

      <a
        href={appUrl}
        target="_blank"
        rel="noreferrer noopener"
        className={buttonVariants({ className: 'no-underline' })}
      >
        Open your Family Space <ExternalIcon aria-hidden />
      </a>
    </div>
  )
}
