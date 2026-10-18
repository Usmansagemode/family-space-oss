import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

type BoardContextValue = {
  familyId: string
  providerToken: string | null
  calendarId: string | null
}

const BoardContext = createContext<BoardContextValue | null>(null)

export function BoardProvider({
  children,
  familyId,
  providerToken,
  calendarId,
}: BoardContextValue & { children: ReactNode }) {
  return (
    <BoardContext.Provider value={{ familyId, providerToken, calendarId }}>
      {children}
    </BoardContext.Provider>
  )
}

export function useBoardContext() {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoardContext must be used within BoardProvider')
  return ctx
}
