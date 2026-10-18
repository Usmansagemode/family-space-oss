import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Loader2, ScanEye, X } from 'lucide-react'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { formatCurrency } from '#/lib/utils'
import { parseLocalDate } from '#/lib/date-utils'
import { getCategoryIcon } from '#/lib/categoryIcons'
import { ChipSelector } from '#/components/expenses/ChipSelector'
import type { Category, ExpenseWithNames, Space } from '@family/types'

type Patch = {
  categoryId?: string | null
  locationId?: string | null
  paidById?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenses: ExpenseWithNames[]
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]
  currency?: string
  locale?: string
  onSave: (updates: Array<{ id: string; patch: Patch }>) => void
  isSaving?: boolean
}

const cardVariants = {
  initial: (dir: 'next' | 'prev') => ({ x: dir === 'next' ? 32 : -32, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: 'next' | 'prev') => ({ x: dir === 'next' ? -32 : 32, opacity: 0 }),
}

function formatExpenseDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function FocusFillMode({
  open,
  onOpenChange,
  expenses,
  categories,
  locationSpaces,
  personSpaces,
  currency,
  locale,
  onSave,
  isSaving,
}: Props) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [patches, setPatches] = useState<Map<string, Patch>>(new Map())

  useEffect(() => {
    if (open) {
      setIndex(0)
      setDirection('next')
      setPatches(
        new Map(
          expenses.map((e) => [
            e.id,
            {
              categoryId: e.categoryId ?? null,
              locationId: e.locationId ?? null,
              paidById: e.paidById ?? null,
            },
          ]),
        ),
      )
    }
  }, [open, expenses])

  const expense = expenses[index]
  const patch = patches.get(expense?.id ?? '') ?? { categoryId: null, locationId: null, paidById: null }

  function setPatch(id: string, update: Partial<Patch>) {
    setPatches((prev) => {
      const next = new Map(prev)
      next.set(id, { ...(next.get(id) ?? {}), ...update })
      return next
    })
  }

  const navigate = useCallback(
    (dir: 'next' | 'prev') => {
      const next = dir === 'next' ? index + 1 : index - 1
      if (next < 0 || next >= expenses.length) return
      setDirection(dir)
      setIndex(next)
    },
    [index, expenses.length],
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate('next')
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate('prev')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, navigate])

  function handleDone() {
    // Only submit expenses where something actually changed from the original
    const updates = expenses.flatMap((e) => {
      const p = patches.get(e.id)
      if (!p) return []
      const changed =
        p.categoryId !== (e.categoryId ?? null) ||
        p.locationId !== (e.locationId ?? null) ||
        p.paidById !== (e.paidById ?? null)
      if (!changed) return []
      return [{ id: e.id, patch: p }]
    })
    onSave(updates)
  }

  if (!expense) return null

  const progress = ((index + 1) / expenses.length) * 100
  const filled = [...patches.values()].filter(
    (p) => p.categoryId || p.locationId || p.paidById,
  ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-screen flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-4 border-b px-6 py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ScanEye className="h-4 w-4" />
            <span className="text-sm font-semibold">Quick Tag</span>
          </div>
          <div className="flex flex-1 items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {index + 1} / {expenses.length}
            </span>
            {filled > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground">· {filled} tagged</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Card area */}
        <div className="flex flex-1 items-center justify-center overflow-hidden px-4 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="w-full max-w-lg"
            >
              <div className="rounded-2xl border bg-card shadow-sm">
                {/* Amount + meta */}
                <div className="border-b px-6 py-5">
                  <p className="text-3xl font-bold tabular-nums">
                    {formatCurrency(expense.amount, currency, locale)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatExpenseDate(expense.date)}
                  </p>
                  {expense.description && (
                    <p className="mt-2 text-base">{expense.description}</p>
                  )}
                </div>

                {/* Chip selectors */}
                <div className="flex flex-col gap-5 px-6 py-5">
                  {personSpaces.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid by</p>
                      <ChipSelector
                        items={personSpaces}
                        selected={patch.paidById ?? null}
                        onSelect={(id) => setPatch(expense.id, { paidById: id })}
                        getColor={(s) => s.color}
                        size="md"
                        renderChip={(space) => (
                          <>
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: space.color }} />
                            {space.name}
                          </>
                        )}
                      />
                    </div>
                  )}

                  {categories.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</p>
                      <ChipSelector
                        items={categories}
                        selected={patch.categoryId ?? null}
                        onSelect={(id) => setPatch(expense.id, { categoryId: id })}
                        getColor={(cat) => cat.color ?? '#888888'}
                        size="md"
                        renderChip={(cat) => {
                          const Icon = getCategoryIcon(cat.icon)
                          return (
                            <>
                              <span
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                                style={{ background: `color-mix(in srgb, ${cat.color ?? '#888888'} 20%, transparent)` }}
                              >
                                <Icon className="h-2.5 w-2.5" style={{ color: cat.color ?? undefined }} />
                              </span>
                              {cat.name}
                            </>
                          )
                        }}
                      />
                    </div>
                  )}

                  {locationSpaces.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</p>
                      <ChipSelector
                        items={locationSpaces}
                        selected={patch.locationId ?? null}
                        onSelect={(id) => setPatch(expense.id, { locationId: id })}
                        getColor={(s) => s.color}
                        size="md"
                        renderChip={(space) => (
                          <>
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: space.color }} />
                            {space.name}
                          </>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t px-6 py-4">
          <Button variant="outline" onClick={() => navigate('prev')} disabled={index === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDone} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & close
            </Button>
            {index < expenses.length - 1 && (
              <Button onClick={() => navigate('next')}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
