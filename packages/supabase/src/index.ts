export { initSupabase, getSupabaseClient, initServiceClient, getServiceClient } from './client'
export { fetchProfile, updateProfile, uploadAvatar } from './profiles'
export type { Profile } from './profiles'

export {
  fetchSpaces,
  fetchArchivedPersonSpaces,
  fetchExpensePickerSpaces,
  createSpace,
  updateSpace,
  archiveSpace,
  restoreSpace,
  deleteSpace,
  countSpaceExpenses,
  reorderSpaces,
} from './spaces'

export {
  fetchCategories,
  fetchAllCategories,
  createCategory,
  updateCategory,
  countCategoryExpenses,
  archiveCategory,
  unarchiveCategory,
  deleteCategory,
  reassignAndDeleteCategory,
  reorderCategories,
} from './categories'

export {
  fetchExpensesByMonth,
  fetchExpensesByYear,
  fetchExpensesByDateRange,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteExpenses,
} from './expenses'

export {
  fetchIncomeEntries,
  createIncomeEntry,
  updateIncomeEntry,
  deleteIncomeEntry,
} from './income'

export { fetchBudgets, upsertBudget, deleteBudget } from './budgets'

export {
  fetchTrackers,
  createTracker,
  updateTracker,
  deleteTracker,
  fetchTrackerEntries,
  addTrackerEntry,
  deleteTrackerEntry,
} from './trackers'

export {
  fetchItems,
  fetchNonRecurringCalendarItems,
  fetchRecurringCalendarItems,
  fetchNextItemAfter,
  createItem,
  updateItem,
  completeItem,
  deleteItem,
  moveItem,
  searchItems,
  reorderItems,
  advanceRecurringItem,
  reAddItem,
} from './items'

export {
  fetchFamily,
  updateFamily,
  findFamily,
  fetchFamilyMembers,
  removeFamilyMember,
  findOrCreateFamily,
} from './families'

export {
  fetchRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from './recurringTransactions'

export { logActivity, fetchActivityLog } from './activity'
export type { RawActivityLog } from './activity'

export { createInvite, getInviteByToken, acceptInvite } from './invites'
export type { InviteInfo } from './invites'

export {
  fetchPlatformStats,
  fetchAllFamilies,
  fetchFamilyAdmin,
  updateFamilyPlan,
  suspendFamily,
  unsuspendFamily,
  fetchAllUsers,
  fetchUserAdmin,
  banUser,
  unbanUser,
  promoteUserToAdmin,
  demoteAdminUser,
  fetchPlanFeatures,
  updatePlanFeature,
  fetchFamilyFeatureOverrides,
  setFamilyFeatureOverride,
  removeFamilyFeatureOverride,
  fetchAllInvites,
  revokeInvite,
  fetchAdminAuditLog,
  deleteFamilyCompletely,
  deleteUserCompletely,
  fetchFamilyMembersAdmin,
  fetchUserFamiliesAdmin,
} from './admin'
export type { AdminFamilyMember, AdminUserFamily } from './admin'
export type { AdminInvite } from './admin'

export {
  fetchSplitGroups,
  fetchSplitGroup,
  createSplitGroup,
  updateSplitGroup,
  deleteSplitGroup,
  fetchSplitParticipants,
  createSplitParticipant,
  deleteSplitParticipant,
  fetchSplitExpenses,
  createSplitExpense,
  updateSplitExpense,
  deleteSplitExpense,
  fetchSplitSettlements,
  createSplitSettlement,
  deleteSplitSettlement,
} from './splits'
