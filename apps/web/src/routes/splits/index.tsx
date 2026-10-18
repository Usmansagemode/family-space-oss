import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Lock, Plus, SplitSquareVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SplitGroup } from '@family/types'
import { useDynamicPlan } from '@family/hooks'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useSplitGroups } from '#/hooks/splits/useSplitGroups'
import { useSplitGroupMutations } from '#/hooks/splits/useSplitGroupMutations'
import { useSplitParticipants } from '#/hooks/splits/useSplitParticipants'
import { CreateGroupSheet } from '#/components/splits/CreateGroupSheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { UpgradePlanDialog } from '#/components/billing/UpgradePlanPrompt'
import { BorderBeam } from '#/components/ui/border-beam'
import { Button } from '#/components/ui/button'
import { NumberTicker } from '#/components/ui/number-ticker'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

export const Route = createFileRoute('/splits/')({
  component: SplitsPage,
})

// Generates a consistent color from a string
function nameToColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function ParticipantAvatars({ names }: { names: string[] }) {
  const max = 4
  const visible = names.slice(0, max)
  const overflow = names.length - max

  return (
    <div className="flex items-center">
      {visible.map((name, i) => (
        <div
          key={i}
          title={name}
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
          className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-white text-[10px] font-semibold ${nameToColor(name)}`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{ marginLeft: -8, zIndex: max }}
          className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground text-[10px] font-semibold"
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group, familyId }: { group: SplitGroup; familyId: string }) {
  const { remove } = useSplitGroupMutations(familyId)
  const { data: participants = [] } = useSplitParticipants(group.id)
  const participantNames = participants.map((p) => p.name)

  async function handleDelete() {
    try {
      await remove.mutateAsync(group.id)
      toast.success('Group deleted')
    } catch {
      toast.error('Failed to delete group')
    }
  }

  return (
    <div className="relative overflow-hidden bg-card border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <BorderBeam size={120} duration={12} colorFrom="oklch(0.7 0.2 250)" colorTo="transparent" borderWidth={1} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <Link
          to="/splits/$groupId"
          params={{ groupId: group.id }}
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="flex-1 min-w-0"
        >
          <h3 className="font-semibold text-base truncate hover:text-primary transition-colors">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-muted-foreground text-sm mt-0.5 truncate">{group.description}</p>
          )}
        </Link>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete group?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{group.name}" and all its expenses, shares, and
                settlements. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {participantNames.length > 0 ? (
          <ParticipantAvatars names={participantNames} />
        ) : (
          <span className="text-muted-foreground text-xs">No participants yet</span>
        )}
        <span className="text-muted-foreground text-xs font-medium">
          <NumberTicker value={participants.length} className="text-foreground font-semibold" />
          {' '}
          {participants.length === 1 ? 'person' : 'people'}
        </span>
      </div>
    </div>
  )
}

function SplitsPage() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const familyId = family?.id ?? ''
  const { data: groups, isLoading } = useSplitGroups(familyId)
  const { splitGroupsLimit } = useDynamicPlan(familyId, family?.plan ?? 'free')
  const [createOpen, setCreateOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const totalGroups = groups?.length ?? 0
  const atLimit = splitGroupsLimit !== null && totalGroups >= splitGroupsLimit

  function handleNewGroup() {
    if (atLimit) return
    setCreateOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Splits</h1>
          </div>
          {totalGroups > 0 && (
            <p className="text-muted-foreground text-sm mt-0.5">
              <NumberTicker value={totalGroups} className="font-medium text-foreground" />
              {' '}{totalGroups === 1 ? 'group' : 'groups'}
            </p>
          )}
        </div>

        {atLimit ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled>
                <Lock className="h-4 w-4" /> New Group
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upgrade to Plus for unlimited groups</TooltipContent>
          </Tooltip>
        ) : (
          <Button onClick={handleNewGroup} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Group
          </Button>
        )}
      </div>

      {/* Upgrade banner — shown when at limit and has at least 1 group */}
      {atLimit && totalGroups > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Free plan includes 1 split group.{' '}
              <span className="font-medium">Upgrade to Plus for unlimited groups.</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="rounded-2xl h-36" />
          ))}
        </div>
      ) : groups?.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-2xl border border-dashed">
          <div className="rounded-full bg-muted p-4">
            <SplitSquareVertical className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div>
            <p className="font-semibold">No groups yet</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Create a group for a trip, shared bills, or any expense you split with others.
            </p>
          </div>
          <Button onClick={handleNewGroup} disabled={atLimit} className="mt-1 gap-1.5">
            <Plus className="h-4 w-4" /> New Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((g) => (
            <GroupCard key={g.id} group={g} familyId={familyId} />
          ))}
        </div>
      )}

      <CreateGroupSheet familyId={familyId} open={createOpen} onOpenChange={setCreateOpen} />
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} requiredPlan="plus" />
    </div>
  )
}
