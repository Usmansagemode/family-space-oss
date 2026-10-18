import { createFileRoute } from '@tanstack/react-router'
import { useDynamicPlan } from '@family/hooks'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import { useCategories } from '#/hooks/categories/useCategories'
import { CSVImportProvider } from '#/contexts/csvImport'
import { ImportWizard } from '#/components/import/ImportWizard'

export const Route = createFileRoute('/import')({
  component: ImportPage,
})

function ImportPage() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const familyId = family?.id ?? ''

  const { can } = useDynamicPlan(familyId, family?.plan ?? 'free')
  const { data: categories } = useCategories(familyId)
  const { data: spaces } = useSpaces(familyId)

  const locationSpaces = (spaces ?? []).filter(
    (s) => s.type === 'store' && s.showInExpenses,
  )
  const personSpaces = (spaces ?? []).filter(
    (s) => s.type === 'person' && s.showInExpenses,
  )

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to import expenses.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <CSVImportProvider
        familyId={familyId}
        categories={categories ?? []}
        locationSpaces={locationSpaces}
        personSpaces={personSpaces}
      >
        <ImportWizard currency={family?.currency} locale={family?.locale} canAiImport={can.importAi} showDuplicates={can.expensesDuplicates} />
      </CSVImportProvider>
    </div>
  )
}
