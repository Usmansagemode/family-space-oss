'use client'

import { cn } from '#/lib/utils'

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  borderWidth?: number
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  delay = 0,
  colorFrom = 'oklch(0.7 0.2 var(--hue, 250))',
  colorTo = 'transparent',
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--delay': `-${delay}s`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--border-width': `${borderWidth}px`,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        '[border:calc(var(--border-width))_solid_transparent]',
        '[background:linear-gradient(white,white)_padding-box,conic-gradient(from_calc(360deg*(var(--delay)/var(--duration)*-1)),var(--color-to),var(--color-from)_var(--percentage,10%),var(--color-to))_border-box]',
        '[mask:linear-gradient(white,white)_padding-box_exclude]',
        '[animation:border-beam_calc(var(--duration)*1s)_calc(var(--delay))_linear_infinite]',
        'dark:[background:linear-gradient(hsl(var(--background)),hsl(var(--background)))_padding-box,conic-gradient(from_calc(360deg*(var(--delay)/var(--duration)*-1)),var(--color-to),var(--color-from)_var(--percentage,10%),var(--color-to))_border-box]',
        className,
      )}
    />
  )
}
