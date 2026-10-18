'use client'

import confettiLib from 'canvas-confetti'
import type { Options } from 'canvas-confetti'

export function confetti(options?: Options): void {
  void confettiLib(options)
}

export { confettiLib as confettiDirect }
