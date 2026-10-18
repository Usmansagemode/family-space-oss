import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/expenses/import')({
  component: ImportExpensesPage,
})

function ImportExpensesPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Import Expenses</h1>
      <p className="text-muted-foreground mt-1 text-sm">CSV and AI PDF import — coming soon.</p>
    </div>
  )
}
