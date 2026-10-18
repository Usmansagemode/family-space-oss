import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { PLAN_UI, getUpgradeCardFeatures } from '#/lib/plan-features'

type Props = {
  /** The minimum plan required to access this feature */
  requiredPlan?: 'plus' | 'pro'
  /** What the locked page looks like — rendered blurred behind the prompt */
  preview?: React.ReactNode
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  requiredPlan?: 'plus' | 'pro'
}

function DefaultPreview() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-72 rounded-xl" />
      ))}
    </div>
  )
}

function PlanCard({
  plan,
  isPrimary,
}: {
  plan: 'plus' | 'pro'
  isPrimary: boolean
}) {
  const meta = PLAN_UI[plan]
  const features = getUpgradeCardFeatures(plan)

  return (
    <div
      className={`border rounded-xl p-5 flex flex-col gap-4 ${
        isPrimary ? `${meta.cardClass}` : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg">{meta.label}</div>
          <div className="text-muted-foreground text-sm">per family / month</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.badgeClass}`}>
          {meta.price}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <li key={f.key} className="flex items-start gap-2 text-sm">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <span>{f.label}</span>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <Button
        className="w-full mt-auto"
        variant={isPrimary ? 'default' : 'outline'}
        onClick={() => toast.info(`${meta.label} upgrade coming soon!`)}
      >
        {meta.cta}
      </Button>
    </div>
  )
}

export function UpgradePlanDialog({ open, onOpenChange, requiredPlan = 'plus' }: DialogProps) {
  const plansToShow: Array<'plus' | 'pro'> =
    requiredPlan === 'pro' ? ['pro'] : ['plus', 'pro']
  const meta = PLAN_UI[requiredPlan]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meta.label} Feature</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{meta.tagline}</p>
        <div className={`grid gap-4 ${plansToShow.length === 1 ? 'max-w-xs' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {plansToShow.map((plan) => (
            <PlanCard key={plan} plan={plan} isPrimary={plan === requiredPlan} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function UpgradePlanPrompt({ requiredPlan = 'plus', preview }: Props) {
  const plansToShow: Array<'plus' | 'pro'> =
    requiredPlan === 'pro' ? ['pro'] : ['plus', 'pro']
  const meta = PLAN_UI[requiredPlan]

  return (
    <div className="relative flex flex-col gap-6">
      {/* Blurred preview — visual hint of what's locked */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {preview ?? <DefaultPreview />}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card border shadow-xl rounded-2xl p-8 w-full max-w-2xl mx-4 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="bg-muted rounded-full p-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">{meta.label} Feature</h2>
            <p className="text-muted-foreground text-sm max-w-sm">{meta.tagline}</p>
          </div>

          <div className={`grid gap-4 w-full ${plansToShow.length === 1 ? 'max-w-xs' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {plansToShow.map((plan) => (
              <PlanCard key={plan} plan={plan} isPrimary={plan === requiredPlan} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
