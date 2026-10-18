import { useState } from 'react'
import { Brain, FileText, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useCSVImport } from '#/contexts/csvImport'
import type { ImportExpense } from '#/contexts/csvImport'
import type { Step } from '#/contexts/csvImport'
import { StandardFormatMapping } from '#/components/import/StandardFormatMapping'
import { WideFormatMapping } from '#/components/import/WideFormatMapping'
import { ImportPreviewTable } from '#/components/import/ImportPreviewTable'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { UpgradePlanDialog } from '#/components/billing/UpgradePlanPrompt'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { getGeminiApiKey, getGeminiModel, isGeminiConfigured } from '#/lib/csv-import'

const WIZARD_STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map Columns' },
  { id: 'preview', label: 'Preview & Save' },
]

function StepIndicator({ step }: { step: Step }) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === step)
  return (
    <div className="flex items-center gap-2">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={[
                'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
                i === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : i < currentIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {i + 1}
            </span>
            <span
              className={[
                'text-sm',
                i === currentIndex
                  ? 'font-semibold text-foreground'
                  : i < currentIndex
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground',
              ].join(' ')}
            >
              {s.label}
            </span>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <span className="text-muted-foreground/40 text-sm">›</span>
          )}
        </div>
      ))}
    </div>
  )
}

type DocumentStyle = 'standard' | 'wide-format'

function UploadStep({ canAiImport }: { canAiImport: boolean }) {
  const { documentStyle, setDocumentStyle, handleFile, setStep, setMappedData, categories, locationSpaces, personSpaces } =
    useCSVImport()
  const [isProcessingPDF, setIsProcessingPDF] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onPDFChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const apiKey = getGeminiApiKey()
    const model = getGeminiModel()

    if (!apiKey) {
      toast.error('Gemini API key not configured', {
        description: 'Go to Settings → Integrations to add your Gemini API key.',
      })
      return
    }

    setIsProcessingPDF(true)
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const genModel = genAI.getGenerativeModel({ model })

      const bytes = await file.arrayBuffer()
      const uint8 = new Uint8Array(bytes)
      let binary = ''
      for (let i = 0; i < uint8.length; i += 8192) {
        binary += String.fromCharCode(...uint8.subarray(i, i + 8192))
      }
      const base64 = btoa(binary)

      const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
      const locationList = locationSpaces.map((s) => `- ${s.name} (id: ${s.id})`).join('\n')
      const personList = personSpaces.map((s) => `- ${s.name} (id: ${s.id})`).join('\n')

      const prompt = `You are a bank statement parser. Extract ALL transactions from this PDF bank statement.

Return ONLY a valid JSON array (no markdown, no code blocks).

Available categories:
${categoryList || '(none — leave categoryId null)'}

Available locations:
${locationList || '(none — leave locationId null)'}

Available people:
${personList || '(none — leave paidById null)'}

Each item:
{
  "date": "YYYY-MM-DD",
  "description": "Merchant name",
  "amount": 123.45,
  "categoryId": "id or null",
  "locationId": "id or null",
  "paidById": "id or null"
}

Rules:
- Extract every debit/expense transaction as a positive amount.
- Extract refunds/credits/reversals as a negative amount (e.g. -12.50).
- Skip pure deposits and income (salary, transfers in).
- Use null for missing IDs.
- Return ONLY the JSON array.`

      const result = await genModel.generateContent([
        { inlineData: { data: base64, mimeType: 'application/pdf' } },
        prompt,
      ])

      const text = result.response.text()
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      let transactions: Array<{
        date: string
        description: string
        amount: number
        categoryId?: string | null
        locationId?: string | null
        paidById?: string | null
      }>

      try {
        const parsed: unknown = JSON.parse(cleaned)
        if (!Array.isArray(parsed)) throw new Error('Expected array')
        transactions = (parsed as typeof transactions).filter((t) => {
          const amount = parseFloat(String(t.amount))
          return (
            typeof t.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
            !isNaN(amount) &&
            amount !== 0
          )
        })
      } catch {
        toast.error('AI returned invalid JSON', {
          description: 'The AI response could not be parsed. Try again.',
        })
        return
      }

      const baseTimestamp = Date.now()
      const expenses: ImportExpense[] = transactions.map((t, i) => {
        const category = t.categoryId ? categories.find((c) => c.id === t.categoryId) ?? null : null
        const location = t.locationId ? locationSpaces.find((s) => s.id === t.locationId) ?? null : null
        const paidBy = t.paidById ? personSpaces.find((s) => s.id === t.paidById) ?? null : null

        return {
          id: `temp-${baseTimestamp}-${i}`,
          date: t.date,
          amount: parseFloat(String(t.amount)),
          description: t.description ?? '',
          categoryId: category?.id ?? null,
          categoryName: category?.name ?? null,
          locationId: location?.id ?? null,
          locationName: location?.name ?? null,
          paidById: paidBy?.id ?? null,
          paidByName: paidBy?.name ?? null,
        }
      })

      toast.success('PDF processed', {
        description: `Found ${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`,
      })
      setMappedData(expenses)
      setStep('preview')
    } catch (error: unknown) {
      console.error('PDF parsing error:', error)
      const msg = error instanceof Error ? error.message : 'Unknown error'
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
        toast.error('Rate limit exceeded', {
          description: 'You have hit the Gemini API rate limit. Please try again later.',
        })
      } else {
        toast.error('Failed to process PDF', { description: msg })
      }
    } finally {
      setIsProcessingPDF(false)
    }
  }

  const geminiConfigured = isGeminiConfigured()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Expenses</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a CSV file or let AI parse your bank statement PDF
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* CSV */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Import CSV</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-style">Document Style</Label>
            <Select
              value={documentStyle ?? ''}
              onValueChange={(val) => setDocumentStyle(val as DocumentStyle)}
            >
              <SelectTrigger id="doc-style">
                <SelectValue placeholder="Select document style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (date, amount, description columns)</SelectItem>
                <SelectItem value="wide-format">Wide Format (each category is a column)</SelectItem>
              </SelectContent>
            </Select>
            {documentStyle === 'standard' && (
              <p className="text-muted-foreground text-xs">
                For CSVs with date, amount, description in separate columns.
              </p>
            )}
            {documentStyle === 'wide-format' && (
              <p className="text-muted-foreground text-xs">
                For CSVs where each category is a column with amounts.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={onFileChange}
              disabled={!documentStyle}
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Select a document style first, then choose your CSV file.
          </p>
        </div>

        {/* PDF */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">AI PDF Processing</h3>
            </div>
            {!canAiImport && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Pro
              </Badge>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-3 py-2.5 text-sm text-blue-800 dark:text-blue-300">
            Upload your bank statement PDF and AI will automatically extract transactions from any bank format.
          </div>

          {!canAiImport ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-muted-foreground text-sm">
                AI PDF import is available on the Pro plan.
              </p>
              <Button variant="default" size="sm" onClick={() => setUpgradeOpen(true)}>
                Upgrade to Pro — $10/mo
              </Button>
              <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} requiredPlan="pro" />
            </div>
          ) : (
            <>
              {!geminiConfigured && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                  Gemini API key not configured. Go to{' '}
                  <a href="/settings?tab=integrations" className="underline font-medium">
                    Settings → Integrations
                  </a>{' '}
                  to add it.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="pdf-upload">Upload PDF Statement</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={onPDFChange}
                  disabled={isProcessingPDF || !geminiConfigured}
                />
              </div>

              {isProcessingPDF && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">Processing PDF with AI</p>
                    <p className="text-muted-foreground text-xs">Extracting transactions from your statement…</p>
                  </div>
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                AI will automatically extract date, amount, and description for each transaction.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MappingStep() {
  const { documentStyle } = useCSVImport()
  if (documentStyle === 'standard') return <StandardFormatMapping />
  if (documentStyle === 'wide-format') return <WideFormatMapping />
  return null
}

interface PreviewStepProps {
  currency?: string
  locale?: string
  showDuplicates?: boolean
}

function PreviewStep({ currency, locale, showDuplicates }: PreviewStepProps) {
  const { mappedData, setStep, documentStyle, handleSave, isSaving } = useCSVImport()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Preview Imported Data</h2>
        <p className="text-muted-foreground text-sm">
          Review and remove rows before saving. Found {mappedData.length} expense{mappedData.length !== 1 ? 's' : ''}.
        </p>
      </div>

      <ImportPreviewTable currency={currency} locale={locale} showDuplicates={showDuplicates} />

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(documentStyle === null ? 'upload' : 'map')}
        >
          Back to {documentStyle === null ? 'Upload' : 'Mapping'}
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={mappedData.length === 0 || isSaving}
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save {mappedData.length} Expense{mappedData.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}

interface ImportWizardProps {
  currency?: string
  locale?: string
  canAiImport?: boolean
  showDuplicates?: boolean
}

export function ImportWizard({ currency, locale, canAiImport = false, showDuplicates = false }: ImportWizardProps) {
  const { step } = useCSVImport()

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />
      {step === 'upload' && <UploadStep canAiImport={canAiImport} />}
      {step === 'map' && <MappingStep />}
      {step === 'preview' && <PreviewStep currency={currency} locale={locale} showDuplicates={showDuplicates} />}
    </div>
  )
}
