import type { ReactNode } from 'react'

import { Input } from '#/components/ui/input'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  help?: ReactNode
  optional?: boolean
  children?: ReactNode
}

/** Label, control, hint, "How to get this" steps and error, wired for screen readers */
export function Field({
  id,
  label,
  error,
  hint,
  help,
  optional,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal"> (optional)</span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {help && (
        <details className="bg-muted/60 rounded-md px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
            How to get this
          </summary>
          <div className="text-muted-foreground mt-2 space-y-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5">
            {help}
          </div>
        </details>
      )}
    </div>
  )
}

/** aria props that tie a control to its Field's hint and error */
export function describedBy(id: string, error?: string, hint?: boolean) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean)
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': ids.length ? ids.join(' ') : undefined,
  }
}

export function TextField(
  props: Omit<FieldProps, 'children'> & {
    value: string
    onChange: (value: string) => void
    type?: string
    autoComplete?: string
    placeholder?: string
    onBlur?: () => void
  },
) {
  const {
    id,
    error,
    hint,
    value,
    onChange,
    type = 'text',
    autoComplete,
    placeholder,
    onBlur,
  } = props
  return (
    <Field {...props}>
      <Input
        {...describedBy(id, error, Boolean(hint))}
        type={type}
        value={value}
        autoComplete={autoComplete ?? 'off'}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </Field>
  )
}

export function ExternalLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  )
}
