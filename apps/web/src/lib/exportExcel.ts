import ExcelJS from 'exceljs'

import { parseLocalDate } from '@/lib/date-utils'
import type { ExpenseWithNames } from '@family/types'

// ── Theme ──────────────────────────────────────────────────────────────────────
const HEADER_BG = 'FF1E40AF' // blue-800
const HEADER_FG = 'FFFFFFFF' // white
const TOTALS_BG = 'FFBFDBFE' // blue-200
const ROW_ALT_BG = 'FFEFF6FF' // blue-50
const BORDER_COLOR = 'FF93C5FD' // blue-300

const headerFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: HEADER_BG },
}

const totalsFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: TOTALS_BG },
}

const altFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: ROW_ALT_BG },
}

const thinBorder: ExcelJS.Borders = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
  diagonal: {},
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11 }
    cell.border = thinBorder
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  })
  row.height = 28
}

function styleDataRow(row: ExcelJS.Row, isAlt: boolean, isTotals = false) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = thinBorder
    cell.alignment = { vertical: 'middle' }
    if (isTotals) {
      cell.fill = totalsFill
      cell.font = { bold: true, size: 10 }
    } else if (isAlt) {
      cell.fill = altFill
    }
  })
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 40) {
  sheet.columns.forEach((col) => {
    let maxLen = minWidth
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 2, maxWidth)
  })
}

function currencyNum(value: number): ExcelJS.CellValue {
  return value === 0 ? (null as unknown as ExcelJS.CellValue) : value
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Main export ────────────────────────────────────────────────────────────────
export async function exportToExcel(expenses: ExpenseWithNames[], year: number): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Family Space'
  wb.created = new Date()

  // Collect all unique categories (sorted by total spend desc)
  const allCategories = [
    ...new Set(expenses.map((e) => e.categoryName ?? '(Uncategorized)')),
  ]

  // ── Sheet 1: All Expenses ────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Expenses')
    ws.addRow(['Date', 'Description', 'Amount', 'Category', 'Location', 'Paid By'])
    styleHeader(ws.getRow(1))

    const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
    sorted.forEach((e, i) => {
      const row = ws.addRow([
        e.date,
        e.description ?? '',
        e.amount,
        e.categoryName ?? '(Uncategorized)',
        e.locationName ?? '(Unknown location)',
        e.paidByName ?? '(Unknown member)',
      ])
      styleDataRow(row, i % 2 === 1)
    })

    const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)
    const totalsRow = ws.addRow(['', 'TOTAL', grandTotal, '', '', ''])
    styleDataRow(totalsRow, false, true)

    ws.getColumn(3).numFmt = '#,##0.00'
    autoFitColumns(ws)
  }

  // ── Sheet 2: Expenses Wide (category columns) ────────────────────────────────
  {
    const ws = wb.addWorksheet('Expenses (Wide)')
    ws.addRow(['Date', 'Description', 'Location', 'Paid By', ...allCategories])
    styleHeader(ws.getRow(1))

    const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date))
    sorted.forEach((e, i) => {
      const row = ws.addRow([
        e.date,
        e.description ?? '',
        e.locationName ?? '(Unknown location)',
        e.paidByName ?? '(Unknown member)',
        ...allCategories.map((cat) =>
          (e.categoryName ?? '(Uncategorized)') === cat ? e.amount : null,
        ),
      ])
      styleDataRow(row, i % 2 === 1)
    })

    const totalsRow = ws.addRow([
      '',
      'TOTAL',
      '',
      '',
      ...allCategories.map((cat) =>
        expenses
          .filter((e) => (e.categoryName ?? '(Uncategorized)') === cat)
          .reduce((s, e) => s + e.amount, 0),
      ),
    ])
    styleDataRow(totalsRow, false, true)

    const amountStartCol = 5
    ws.columns.forEach((col, i) => {
      if (i >= amountStartCol - 1) col.numFmt = '#,##0.00'
    })
    autoFitColumns(ws)
  }

  // ── Sheet 3: Monthly Totals ──────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Monthly Totals')
    ws.addRow(['Month', 'Total'])
    styleHeader(ws.getRow(1))

    const monthlyTotals = new Array(12).fill(0) as number[]
    expenses.forEach((e) => {
      monthlyTotals[parseLocalDate(e.date).getMonth()] += e.amount
    })

    MONTH_NAMES.forEach((month, i) => {
      const row = ws.addRow([month, monthlyTotals[i]])
      styleDataRow(row, i % 2 === 1)
    })

    const totalsRow = ws.addRow(['TOTAL', monthlyTotals.reduce((s, v) => s + v, 0)])
    styleDataRow(totalsRow, false, true)

    ws.getColumn(2).numFmt = '#,##0.00'
    autoFitColumns(ws)
  }

  // ── Sheet 4: Category Totals ─────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Category Totals')
    ws.addRow(['Category', 'Total', '% of Spend'])
    styleHeader(ws.getRow(1))

    const catTotals: Record<string, number> = {}
    expenses.forEach((e) => {
      const cat = e.categoryName ?? '(Uncategorized)'
      catTotals[cat] = (catTotals[cat] ?? 0) + e.amount
    })

    const grandTotal = Object.values(catTotals).reduce((s, v) => s + v, 0)
    Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, total], i) => {
        const row = ws.addRow([
          cat,
          total,
          grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(1)}%` : '0%',
        ])
        styleDataRow(row, i % 2 === 1)
      })

    const totalsRow = ws.addRow(['TOTAL', grandTotal, '100%'])
    styleDataRow(totalsRow, false, true)

    ws.getColumn(2).numFmt = '#,##0.00'
    autoFitColumns(ws)
  }

  // ── Sheet 5: Category by Month ───────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Category by Month')
    ws.addRow(['Month', ...allCategories, 'Total'])
    styleHeader(ws.getRow(1))

    const catByMonth = MONTH_NAMES.map((_, monthIdx) =>
      allCategories.map((cat) =>
        expenses
          .filter(
            (e) =>
              parseLocalDate(e.date).getMonth() === monthIdx &&
              (e.categoryName ?? '(Uncategorized)') === cat,
          )
          .reduce((s, e) => s + e.amount, 0),
      ),
    )

    MONTH_NAMES.forEach((month, monthIdx) => {
      const monthAmounts = catByMonth[monthIdx]!
      const monthTotal = monthAmounts.reduce((s, v) => s + v, 0)
      const row = ws.addRow([month, ...monthAmounts.map(currencyNum), monthTotal])
      styleDataRow(row, monthIdx % 2 === 1)
    })

    const catColumnTotals = allCategories.map((_, catIdx) =>
      catByMonth.reduce((s, monthRow) => s + (monthRow[catIdx] ?? 0), 0),
    )
    const grandTotal = catColumnTotals.reduce((s, v) => s + v, 0)
    const totalsRow = ws.addRow(['TOTAL', ...catColumnTotals, grandTotal])
    styleDataRow(totalsRow, false, true)

    ws.columns.forEach((col, i) => {
      if (i >= 1) col.numFmt = '#,##0.00'
    })
    autoFitColumns(ws)
  }

  // ── Sheet 6: By Location ─────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('By Location')
    ws.addRow(['Location', 'Total', '% of Spend'])
    styleHeader(ws.getRow(1))

    const locationTotals: Record<string, number> = {}
    expenses.forEach((e) => {
      const loc = e.locationName ?? '(Unknown location)'
      locationTotals[loc] = (locationTotals[loc] ?? 0) + e.amount
    })

    const grandTotal = Object.values(locationTotals).reduce((s, v) => s + v, 0)
    Object.entries(locationTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([loc, total], i) => {
        const row = ws.addRow([
          loc,
          total,
          grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(1)}%` : '0%',
        ])
        styleDataRow(row, i % 2 === 1)
      })

    const totalsRow = ws.addRow(['TOTAL', grandTotal, '100%'])
    styleDataRow(totalsRow, false, true)

    ws.getColumn(2).numFmt = '#,##0.00'
    autoFitColumns(ws)
  }

  // ── Sheet 7: By Member ───────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('By Member')
    ws.addRow(['Member', 'Total', '% of Spend'])
    styleHeader(ws.getRow(1))

    const memberTotals: Record<string, number> = {}
    expenses.forEach((e) => {
      const member = e.paidByName ?? '(Unknown member)'
      memberTotals[member] = (memberTotals[member] ?? 0) + e.amount
    })

    const grandTotal = Object.values(memberTotals).reduce((s, v) => s + v, 0)
    Object.entries(memberTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([member, total], i) => {
        const row = ws.addRow([
          member,
          total,
          grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(1)}%` : '0%',
        ])
        styleDataRow(row, i % 2 === 1)
      })

    const totalsRow = ws.addRow(['TOTAL', grandTotal, '100%'])
    styleDataRow(totalsRow, false, true)

    ws.getColumn(2).numFmt = '#,##0.00'
    autoFitColumns(ws)
  }

  // ── Sheet 8: Top Expenses ────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Top Expenses')
    ws.addRow(['Rank', 'Date', 'Description', 'Amount', 'Category', 'Location', 'Paid By'])
    styleHeader(ws.getRow(1))

    ;[...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .forEach((e, i) => {
        const row = ws.addRow([
          i + 1,
          e.date,
          e.description ?? '',
          e.amount,
          e.categoryName ?? '(Uncategorized)',
          e.locationName ?? '(Unknown location)',
          e.paidByName ?? '(Unknown member)',
        ])
        styleDataRow(row, i % 2 === 1)
      })

    ws.getColumn(4).numFmt = '#,##0.00'
    autoFitColumns(ws)
  }

  // ── Download ──────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `family-expenses-${year}-report.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
