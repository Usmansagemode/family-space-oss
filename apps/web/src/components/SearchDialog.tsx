import { useState, useEffect } from 'react'
import { useDebounce } from '@family/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog'
import { AddItemSheet } from '#/components/board/AddItemSheet'
import { BoardProvider } from '#/contexts/board'
import { useSearchItems } from '#/hooks/items/useSearchItems'
import { useItemMutations } from '#/hooks/items/useItemMutations'
import type { SearchResult } from '#/hooks/items/useSearchItems'
import type { Item } from '#/entities/Item'
import type { Space } from '#/entities/Space'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  providerToken: string | null
  calendarId: string | null
}

export function SearchDialog({
  open,
  onOpenChange,
  familyId,
  providerToken,
  calendarId,
}: Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [selected, setSelected] = useState<SearchResult | null>(null)

  // Reset on close
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onOpenChange])

  const { data: results, isLoading } = useSearchItems(familyId, debouncedQuery)

  // Group results by space
  const grouped: Array<{ space: Space; items: Item[] }> = []
  for (const r of results ?? []) {
    const existing = grouped.find((g) => g.space.id === r.space.id)
    if (existing) {
      existing.items.push(r.item)
    } else {
      grouped.push({ space: r.space, items: [r.item] })
    }
  }

  function handleSelect(result: SearchResult) {
    setSelected(result)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Search items</DialogTitle>

          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search items…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-96">
              {!debouncedQuery.trim() ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Start typing to search across all spaces
                </p>
              ) : isLoading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Searching…
                </p>
              ) : grouped.length === 0 ? (
                <CommandEmpty>No results for "{debouncedQuery}"</CommandEmpty>
              ) : (
                grouped.map(({ space, items }) => (
                  <CommandGroup
                    key={space.id}
                    heading={
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: space.color }}
                        />
                        {space.name}
                      </span>
                    }
                  >
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect({ item, space })}
                        className="gap-3"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: space.color }}
                        />
                        <span className="flex-1 truncate">
                          {item.title}
                          {item.quantity && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              × {item.quantity}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Edit sheet — opens when a result is selected */}
      {selected && (
        <BoardProvider
          familyId={familyId}
          providerToken={providerToken}
          calendarId={calendarId}
        >
          <SelectedItemSheet
            result={selected}
            familyId={familyId}
            onClose={() => setSelected(null)}
          />
        </BoardProvider>
      )}
    </>
  )
}

function SelectedItemSheet({
  result,
  familyId,
  onClose,
}: {
  result: SearchResult
  familyId: string
  onClose: () => void
}) {
  const { item, space } = result
  const { update, complete, remove, move } = useItemMutations(item.spaceId)
  const [open, setOpen] = useState(true)

  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (!o) onClose()
  }

  return (
    <AddItemSheet
      open={open}
      onOpenChange={handleOpenChange}
      spaceId={space.id}
      spaceName={space.name}
      spaceType={space.type}
      familyId={familyId}
      editItem={item}
      onCreate={() => {}}
      onUpdate={(input) =>
        update.mutate(input, { onSuccess: () => handleOpenChange(false) })
      }
      onComplete={(it) =>
        complete.mutate(it, { onSuccess: () => handleOpenChange(false) })
      }
      onDelete={(it) =>
        remove.mutate(it, { onSuccess: () => handleOpenChange(false) })
      }
      onMove={(newSpaceId) =>
        move.mutate(
          { id: item.id, newSpaceId },
          { onSuccess: () => handleOpenChange(false) },
        )
      }
      isPending={
        update.isPending ||
        complete.isPending ||
        remove.isPending ||
        move.isPending
      }
    />
  )
}
