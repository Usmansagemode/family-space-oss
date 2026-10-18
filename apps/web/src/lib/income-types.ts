import {
  Briefcase,
  Building2,
  CircleDollarSign,
  Home,
  Laptop,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { IncomeType } from '@family/types'

export type IncomeTypeDef = { id: IncomeType; label: string; icon: LucideIcon; hex: string }

export const INCOME_TYPES: IncomeTypeDef[] = [
  { id: 'salary',     label: 'Salary',     icon: Briefcase,        hex: '#3b82f6' },
  { id: 'side_gig',  label: 'Side Gig',   icon: CircleDollarSign, hex: '#8b5cf6' },
  { id: 'freelance',  label: 'Freelance',  icon: Laptop,           hex: '#f97316' },
  { id: 'business',   label: 'Business',   icon: Building2,        hex: '#10b981' },
  { id: 'rental',     label: 'Rental',     icon: Home,             hex: '#f59e0b' },
  { id: 'investment', label: 'Investment', icon: TrendingUp,       hex: '#22c55e' },
  { id: 'other',      label: 'Other',      icon: Wallet,           hex: '#6b7280' },
]
