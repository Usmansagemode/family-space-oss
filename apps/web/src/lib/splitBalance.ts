import type { SplitParticipant, SplitExpenseWithShares, SplitSettlement } from '@family/types'

export type ParticipantBalance = {
  participantId: string
  name: string
  net: number // positive = others owe you, negative = you owe others
}

export type SimplifiedDebt = {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export function calculateBalances(
  participants: SplitParticipant[],
  expenses: SplitExpenseWithShares[],
  settlements: SplitSettlement[],
): ParticipantBalance[] {
  const net: Record<string, number> = {}
  for (const p of participants) net[p.id] = 0

  for (const e of expenses) {
    net[e.paidByParticipantId] = (net[e.paidByParticipantId] ?? 0) + e.amount
    for (const s of e.shares) {
      net[s.participantId] = (net[s.participantId] ?? 0) - s.amount
    }
  }

  for (const s of settlements) {
    net[s.fromParticipantId] = (net[s.fromParticipantId] ?? 0) + s.amount
    net[s.toParticipantId] = (net[s.toParticipantId] ?? 0) - s.amount
  }

  return participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    net: Math.round((net[p.id] ?? 0) * 100) / 100,
  }))
}

export function simplifyDebts(balances: ParticipantBalance[]): SimplifiedDebt[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net)

  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net)

  const result: SimplifiedDebt[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.round(Math.min(creditor.net, -debtor.net) * 100) / 100

    result.push({
      fromId: debtor.participantId,
      fromName: debtor.name,
      toId: creditor.participantId,
      toName: creditor.name,
      amount,
    })

    creditor.net = Math.round((creditor.net - amount) * 100) / 100
    debtor.net = Math.round((debtor.net + amount) * 100) / 100

    if (creditor.net < 0.005) ci++
    if (debtor.net > -0.005) di++
  }

  return result
}
