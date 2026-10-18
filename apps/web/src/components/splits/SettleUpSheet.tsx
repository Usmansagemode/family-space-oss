import { useState } from 'react'
import { toast } from 'sonner'
import type { SplitParticipant } from '@family/types'
import type { SimplifiedDebt } from '#/lib/splitBalance'
import { useSplitSettlementMutations } from '#/hooks/splits/useSplitSettlementMutations'
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
  groupId: string
  familyId: string
  participants: SplitParticipant[]
  debt?: SimplifiedDebt
  open: boolean
  onOpenChange: (open: boolean) => void
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SettleUpSheet({ groupId, familyId, participants, debt, open, onOpenChange }: Props) {
  const { record } = useSplitSettlementMutations(groupId, familyId)
  const [amount, setAmount] = useState(debt ? String(debt.amount) : '')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())

  const fromName = debt?.fromName ?? ''
  const toName = debt?.toName ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!debt) return
    try {
      await record.mutateAsync({
        fromParticipantId: debt.fromId,
        toParticipantId: debt.toId,
        amount: parseFloat(amount),
        note: note.trim() || undefined,
        date,
      })
      toast.success('Settlement recorded')
      setNote('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to record settlement')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Record Settlement</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <span className="font-medium">{fromName}</span>
            <span className="text-muted-foreground"> pays </span>
            <span className="font-medium">{toName}</span>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. Paid via Venmo"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={!amount || record.isPending}>
            Record Settlement
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
