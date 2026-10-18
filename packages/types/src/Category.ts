export type Category = {
  id: string
  familyId: string
  name: string
  /** OKLCH color string e.g. 'oklch(0.70 0.15 145)' */
  color: string | null
  /** Lucide icon name e.g. 'ShoppingCart' */
  icon: string | null
  sortOrder: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
