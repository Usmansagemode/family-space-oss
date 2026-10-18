import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SplitParticipant } from '@family/types'
import { useSplitParticipantMutations } from '#/hooks/splits/useSplitParticipantMutations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'

type Props = {
  groupId: string
  participants: SplitParticipant[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageParticipantsSheet({ groupId, participants, open, onOpenChange }: Props) {
  const { add, remove } = useSplitParticipantMutations(groupId)
  const [newName, setNewName] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await add.mutateAsync(newName.trim())
      setNewName('')
    } catch {
      toast.error('Failed to add participant')
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove.mutateAsync(id)
    } catch {
      toast.error('Cannot remove — participant has expenses')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Manage Participants</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{p.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
            {participants.length === 0 && (
              <p className="text-muted-foreground text-sm">No participants yet.</p>
            )}
          </ul>

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="Add person..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" disabled={!newName.trim() || add.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
