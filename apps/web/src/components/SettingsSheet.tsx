import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  UserPlus,
  User,
  X,
  Crown,
  Users,
  Link2,
} from 'lucide-react'
import { createInvite } from '#/lib/supabase/invites'
import { removeFamilyMember, updateFamily } from '#/lib/supabase/families'
import { useFamilyMembers } from '#/hooks/auth/useFamilyMembers'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'

type Tab = 'family' | 'connections'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STEPS = [
  {
    title: 'Enable the Google Calendar API',
    body: (
      <>
        Go to{' '}
        <a
          href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-2"
        >
          Google Cloud Console <ExternalLink className="h-3 w-3" />
        </a>
        , select or create a project, and click <strong>Enable</strong>.
      </>
    ),
  },
  {
    title: 'Create OAuth credentials',
    body: (
      <>
        Go to{' '}
        <strong>
          APIs &amp; Services → Credentials → Create Credentials → OAuth 2.0
          Client ID
        </strong>
        . Choose <strong>Web application</strong>. Under{' '}
        <strong>Authorised redirect URIs</strong> add:
        <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs break-all">
          {`${import.meta.env['VITE_SUPABASE_URL']}/auth/v1/callback`}
        </code>
        Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.
      </>
    ),
  },
  {
    title: 'Configure Supabase Google provider',
    body: (
      <>
        In your{' '}
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-2"
        >
          Supabase dashboard <ExternalLink className="h-3 w-3" />
        </a>
        , go to <strong>Authentication → Providers → Google</strong>, enable it,
        and paste in the Client ID and Client Secret from step 2.
      </>
    ),
  },
  {
    title: 'Add yourself as a test user',
    body: (
      <>
        In Google Cloud Console go to{' '}
        <strong>APIs &amp; Services → OAuth consent screen → Test users</strong>{' '}
        and add your Gmail address. This lets you sign in while the app is in
        testing mode (no Google review needed for personal use).
      </>
    ),
  },
  {
    title: 'Sign in with Google',
    body: <>Sign out of the app if needed, then sign back in with Google.</>,
  },
  {
    title: 'Create a dedicated calendar',
    body: (
      <>
        Open{' '}
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-2"
        >
          Google Calendar <ExternalLink className="h-3 w-3" />
        </a>
        . In the left sidebar click <strong>Other calendars → +</strong> and
        choose <strong>Create new calendar</strong>. Name it something like{' '}
        <em>Family Space</em> and click <strong>Create calendar</strong>.
      </>
    ),
  },
  {
    title: 'Find and copy the Calendar ID',
    body: (
      <>
        Click the three dots next to your new calendar →{' '}
        <strong>Settings</strong>. Scroll down to{' '}
        <strong>Integrate calendar</strong>. Copy the{' '}
        <strong>Calendar ID</strong> — it looks like{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          abc123@group.calendar.google.com
        </code>
        .
      </>
    ),
  },
  {
    title: 'Paste the Calendar ID here',
    body: (
      <>
        Paste it into the <strong>Google Calendar ID</strong> field above and
        click <strong>Save</strong>. Any item you add with a date will now
        appear in that calendar automatically.
      </>
    ),
  },
]

export function SettingsSheet({ open, onOpenChange }: Props) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const { data: family } = useUserFamily(user?.id)
  const [tab, setTab] = useState<Tab>('family')
  const [familyName, setFamilyName] = useState('')
  const [calendarId, setCalendarId] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [howToOpen, setHowToOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setTab('family')
      setFamilyName(family?.name ?? '')
      setCalendarId(family?.googleCalendarId ?? '')
      setEmbedUrl(family?.googleCalendarEmbedUrl ?? '')
      setHowToOpen(false)
      setInviteLink(null)
      setCopied(false)
    }
  }, [
    open,
    family?.name,
    family?.googleCalendarId,
    family?.googleCalendarEmbedUrl,
  ])

  const { data: members, isLoading: membersLoading } = useFamilyMembers(
    family?.id,
  )
  const isOwner = members?.find((m) => m.userId === user?.id)?.role === 'owner'

  const removeMember = useMutation({
    mutationFn: (userId: string) => {
      if (!family?.id) throw new Error('Family not loaded')
      return removeFamilyMember(family.id, userId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['family-members', family?.id],
      })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const invite = useMutation({
    mutationFn: () => {
      if (!family?.id) throw new Error('Family not loaded')
      return createInvite(family.id)
    },
    onSuccess: (token: string) => {
      setInviteLink(`${window.location.origin}/invite?token=${token}`)
    },
    onError: () => toast.error('Failed to create invite link'),
  })

  function handleCopy() {
    if (!inviteLink) return
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const save = useMutation({
    mutationFn: () => {
      if (!family?.id) throw new Error('Family not loaded')
      return updateFamily(family.id, {
        name: familyName.trim() || 'Our Family',
        googleCalendarId: calendarId.trim() || undefined,
        googleCalendarEmbedUrl: embedUrl.trim() || undefined,
      })
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: ['family', 'user', user?.id],
      })
      void queryClient.invalidateQueries({ queryKey: ['family', updated.id] })
      toast.success('Settings saved')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Failed to save settings')
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-6 pb-0">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription className="sr-only">
            Configure your family space
          </SheetDescription>
          {/* Tab bar */}
          <div className="mt-4 flex gap-1">
            <button
              type="button"
              onClick={() => setTab('family')}
              className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === 'family'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Family
            </button>
            <button
              type="button"
              onClick={() => setTab('connections')}
              className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === 'connections'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Connections
            </button>
          </div>
        </SheetHeader>

        {/* Family tab */}
        {tab === 'family' && (
          <>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {/* Family name */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="family-name">Family name</Label>
                <Input
                  id="family-name"
                  placeholder="Our Family"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>

              {/* Invite member */}
              <div className="flex flex-col gap-2">
                <Label>Invite a family member</Label>
                <p className="text-xs text-muted-foreground">
                  Generate a one-time link and share it however you like.
                </p>
                {inviteLink ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {inviteLink}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 text-muted-foreground transition hover:text-foreground"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start gap-2"
                    onClick={() => invite.mutate()}
                    disabled={invite.isPending || !family}
                  >
                    {invite.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Create invite link
                  </Button>
                )}
              </div>

              {/* Family members */}
              <div className="flex flex-col gap-2">
                <Label>Members</Label>
                <div className="flex flex-col gap-2">
                  {membersLoading ? (
                    <>
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-3/4" />
                    </>
                  ) : (members ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No members found.
                    </p>
                  ) : (
                    (members ?? []).map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              className="h-7 w-7 rounded-full"
                              alt=""
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm leading-none">
                            {member.name ?? member.email ?? 'Unknown'}
                            {member.userId === user?.id && (
                              <span className="text-muted-foreground">
                                {' '}
                                (you)
                              </span>
                            )}
                          </span>
                          {member.name && member.email && (
                            <span className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </span>
                          )}
                        </div>
                        {member.role === 'owner' ? (
                          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        ) : isOwner ? (
                          <button
                            type="button"
                            onClick={() => removeMember.mutate(member.userId)}
                            disabled={removeMember.isPending}
                            className="shrink-0 text-muted-foreground transition hover:text-destructive"
                            title="Remove member"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border p-6">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={save.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !family}
                >
                  {save.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Connections tab */}
        {tab === 'connections' && (
          <>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {/* Calendar ID input */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="calendar-id">Google Calendar ID</Label>
                <Input
                  id="calendar-id"
                  placeholder="abc123@group.calendar.google.com"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Items with a date will sync to this Google Calendar.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="embed-url">Calendar Embed URL</Label>
                <Input
                  id="embed-url"
                  placeholder="https://calendar.google.com/calendar/embed?src=…"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                />
                {embedUrl.trim() &&
                  !embedUrl
                    .trim()
                    .startsWith(
                      'https://calendar.google.com/calendar/embed',
                    ) && (
                    <p className="text-xs text-destructive">
                      Should start with
                      https://calendar.google.com/calendar/embed
                    </p>
                  )}
                <p className="text-xs text-muted-foreground">
                  Google Calendar → Settings → your calendar → Integrate
                  calendar → copy the <strong>src=</strong> URL from the Embed
                  code.
                </p>
              </div>

              {/* How-to — subtle help link */}
              <div>
                <button
                  type="button"
                  onClick={() => setHowToOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {howToOpen ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  How to set up Google Calendar
                </button>

                {howToOpen && (
                  <ol className="mt-4 flex flex-col gap-5 border-l-2 border-border pl-4">
                    {STEPS.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium leading-snug">
                            {step.title}
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {step.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <div className="border-t border-border p-6">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={save.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !family}
                >
                  {save.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
