export type FamilyPlan = 'free' | 'plus' | 'pro'

export type FamilyMember = {
  userId: string
  familyId: string
  role: 'owner' | 'member'
  name: string | null
  email: string | null
  avatarUrl: string | null
  joinedAt: Date
}

export type Family = {
  id: string
  name: string
  plan: FamilyPlan
  /** ISO 4217 currency code e.g. 'USD', 'GBP', 'PKR' */
  currency: string
  /** BCP 47 locale e.g. 'en-US', 'en-GB' */
  locale: string
  googleCalendarId?: string
  googleCalendarEmbedUrl?: string
  /** Set by an admin when the family account has been suspended */
  suspendedAt?: Date | null
  suspendReason?: string | null
  /** Null until the owner completes (or skips) the post-signup onboarding wizard */
  onboardingCompletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}
