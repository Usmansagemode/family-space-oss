import { useEffect, useState } from 'react'
import type { ExpenseWithNames } from '@family/types'
import { cn } from '#/lib/utils'
import { formatCurrency } from '#/lib/utils'

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}

export function MemberCategoryHeatmap({ expenses, currency, locale }: Props) {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    const el = document.documentElement
    const check = () => setIsDark(el.classList.contains('dark'))
    const observer = new MutationObserver(check)
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Collect unique members and categories
  const members = new Map<string, string>() // id → name
  const categories = new Map<string, string>() // id → name

  for (const e of expenses) {
    const memberKey = e.paidById ?? '__none__'
    const memberName = e.paidByName ?? '(Unknown member)'
    const catKey = e.categoryId ?? '__none__'
    const catName = e.categoryName ?? '(Uncategorized)'
    members.set(memberKey, memberName)
    categories.set(catKey, catName)
  }

  const memberList = [...members.entries()]
  const categoryList = [...categories.entries()]

  // Build totals matrix: memberKey → catKey → total
  const matrix = new Map<string, Map<string, number>>()
  for (const e of expenses) {
    const memberKey = e.paidById ?? '__none__'
    const catKey = e.categoryId ?? '__none__'
    if (!matrix.has(memberKey)) matrix.set(memberKey, new Map())
    const memberRow = matrix.get(memberKey)!
    memberRow.set(catKey, (memberRow.get(catKey) ?? 0) + e.amount)
  }

  // Find max for color intensity
  let maxAmount = 0
  for (const row of matrix.values()) {
    for (const v of row.values()) {
      if (v > maxAmount) maxAmount = v
    }
  }

  if (memberList.length === 0 || categoryList.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  function cellColor(amount: number): string {
    if (!amount || !maxAmount) return ''
    const intensity = amount / maxAmount
    if (isDark) {
      const lightness = 0.18 + intensity * 0.35
      const chroma = 0.04 + intensity * 0.14
      return `oklch(${lightness.toFixed(2)} ${chroma.toFixed(3)} 250)`
    }
    const lightness = 0.92 - intensity * 0.42
    const chroma = 0.02 + intensity * 0.14
    return `oklch(${lightness.toFixed(2)} ${chroma.toFixed(3)} 250)`
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground font-medium border border-border">
              Member \ Category
            </th>
            {categoryList.map(([catId, catName]) => (
              <th
                key={catId}
                className="p-2 text-center text-muted-foreground font-medium border border-border max-w-[80px]"
              >
                <span className="block truncate max-w-[70px]" title={catName}>
                  {catName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {memberList.map(([memberKey, memberName]) => (
            <tr key={memberKey}>
              <td className="p-2 font-medium border border-border whitespace-nowrap">
                {memberName}
              </td>
              {categoryList.map(([catKey]) => {
                const amount = matrix.get(memberKey)?.get(catKey) ?? 0
                const bg = cellColor(amount)
                return (
                  <td
                    key={catKey}
                    className={cn(
                      'p-2 text-center border border-border tabular-nums',
                      amount > 0 ? 'font-medium' : 'text-muted-foreground',
                      !bg && 'bg-muted',
                    )}
                    style={bg ? { background: bg } : undefined}
                  >
                    {amount > 0
                      ? formatCurrency(amount, currency, locale)
                      : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
