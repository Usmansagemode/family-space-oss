import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useTrackers } from '#/hooks/trackers/useTrackers'
import { useTrackerEntries } from '#/hooks/trackers/useTrackerEntries'
import { useTrackerMutations } from '#/hooks/trackers/useTrackerMutations'
import { TrackerCard } from '#/components/trackers/TrackerCard'
import { CreateTrackerSheet } from '#/components/trackers/CreateTrackerSheet'
import { AddEntrySheet } from '#/components/trackers/AddEntrySheet'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { Tracker } from '@family/types'

export const Route = createFileRoute('/trackers')({
  component: TrackersPage,
})

function TrackersPage() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const familyId = family?.id ?? ''

  const { data: trackers, isLoading } = useTrackers(familyId)
  const mutations = useTrackerMutations(familyId)

  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null)
  const [addEntryTracker, setAddEntryTracker] = useState<Tracker | null>(null)

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Please sign in to view your trackers.
        </p>
      </div>
    )
  }

  function handleCreateSave(data: {
    title: string
    description?: string
    initialBalance: number
    color?: string
  }) {
    if (editingTracker) {
      mutations.update.mutate(
        { id: editingTracker.id, ...data },
        {
          onSuccess: () => {
            setCreateSheetOpen(false)
            setEditingTracker(null)
          },
        },
      )
    } else {
      mutations.create.mutate(data, {
        onSuccess: () => setCreateSheetOpen(false),
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Trackers</h1>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setEditingTracker(null)
              setCreateSheetOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New tracker
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !trackers || trackers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <p className="text-muted-foreground">No trackers yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a tracker to monitor debt, savings, or any running balance.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setEditingTracker(null)
              setCreateSheetOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New tracker
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trackers.map((tracker) => (
            <TrackerCardWrapper
              key={tracker.id}
              tracker={tracker}
              familyId={familyId}
              currency={family?.currency}
              locale={family?.locale}
              onEdit={() => {
                setEditingTracker(tracker)
                setCreateSheetOpen(true)
              }}
              onDelete={() => mutations.remove.mutate(tracker.id)}
              onAddEntry={() => setAddEntryTracker(tracker)}
            />
          ))}
        </div>
      )}

      <CreateTrackerSheet
        open={createSheetOpen}
        onOpenChange={(v) => {
          setCreateSheetOpen(v)
          if (!v) setEditingTracker(null)
        }}
        tracker={editingTracker}
        onSave={handleCreateSave}
        isSaving={mutations.create.isPending || mutations.update.isPending}
      />

      {addEntryTracker && (
        <AddEntrySheet
          open={!!addEntryTracker}
          onOpenChange={(v) => {
            if (!v) setAddEntryTracker(null)
          }}
          tracker={addEntryTracker}
          familyId={familyId}
          currency={family?.currency}
          locale={family?.locale}
          onSave={(data) => {
            mutations.addEntry.mutate(
              { trackerId: addEntryTracker.id, ...data },
              { onSuccess: () => setAddEntryTracker(null) },
            )
          }}
          isSaving={mutations.addEntry.isPending}
        />
      )}
    </div>
  )
}

function TrackerCardWrapper({
  tracker,
  familyId,
  currency,
  locale,
  onEdit,
  onDelete,
  onAddEntry,
}: {
  tracker: Tracker
  familyId: string
  currency?: string
  locale?: string
  onEdit: () => void
  onDelete: () => void
  onAddEntry: () => void
}) {
  const { data: entries } = useTrackerEntries(tracker.id)

  return (
    <TrackerCard
      tracker={tracker}
      entries={entries ?? []}
      familyId={familyId}
      currency={currency}
      locale={locale}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddEntry={onAddEntry}
    />
  )
}
