export type SpaceType = 'person' | 'store' | 'chore'

export type Space = {
  id: string
  familyId: string
  name: string
  color: string
  type: SpaceType
  sortOrder: number
  /** Controls visibility in expense pickers.
   *  person + true  → shows in "Paid by" dropdown
   *  store  + true  → shows in "Location" dropdown
   *  either + false → board column only */
  showInExpenses: boolean
  /** For store spaces: optionally assigned to a person for accountability */
  assignedPersonId: string | null
  /** Auto-created system spaces (one per member) cannot be deleted */
  isSystem: boolean
  /** For person spaces: the family member this space represents */
  linkedUserId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
