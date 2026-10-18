import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createSplitParticipant } from '@family/supabase'
import { useSplitGroupMutations } from '#/hooks/splits/useSplitGroupMutations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'

type Props = {
  familyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupSheet({ familyId, open, onOpenChange }: Props) {
  const { create } = useSplitGroupMutations(familyId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [participants, setParticipants] = useState<string[]>([''])

  function addParticipantRow() {
    setParticipants((p) => [...p, ''])
  }

  function updateParticipant(index: number, value: string) {
    setParticipants((p) => p.map((v, i) => (i === index ? value : v)))
  }

  function removeParticipant(index: number) {
    setParticipants((p) => p.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const group = await create.mutateAsync({ familyId, name: name.trim(), description: description.trim() || undefined })
      const names = participants.map((p) => p.trim()).filter(Boolean)
      await Promise.all(names.map((n) => createSplitParticipant({ groupId: group.id, name: n })))
      toast.success('Group created')
      setName('')
      setDescription('')
      setParticipants([''])
      onOpenChange(false)
    } catch {
      toast.error('Failed to create group')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-6">
        <SheetHeader className="p-0">
          <SheetTitle>New Group</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Bali Trip, Apartment Bills"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-desc">Description (optional)</Label>
            <Input
              id="group-desc"
              placeholder="What's this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Person ${i + 1}`}
                    value={p}
                    onChange={(e) => updateParticipant(i, e.target.value)}
                  />
                  {participants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParticipant(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addParticipantRow} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add person
            </Button>
          </div>

          <Button type="submit" disabled={!name.trim() || create.isPending} className="mt-2">
            Create Group
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
