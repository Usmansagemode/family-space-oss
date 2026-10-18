import type { ReactNode } from 'react'

type Props = {
  icon?: ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      {icon && <div className="text-muted-foreground/50">{icon}</div>}
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground/70">{description}</p>
      )}
    </div>
  )
}
