'use client'

import { AnimatePresence, motion } from 'motion/react'
import { cn } from '#/lib/utils'

interface AnimatedListProps {
  className?: string
  children: React.ReactNode
}

export function AnimatedList({ className, children }: AnimatedListProps) {
  const childrenArray = Array.isArray(children) ? children : [children]
  const reversedArray = [...childrenArray].reverse()

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <AnimatePresence>
        {reversedArray.map((item, index) => (
          <AnimatedListItem
            key={(item as React.ReactElement<{ key?: string }>).key ?? index}
          >
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  )
}

function AnimatedListItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="mx-auto w-full"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, originY: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring' as const, stiffness: 350, damping: 40 }}
    >
      {children}
    </motion.div>
  )
}
