export const STORE_DEFINITIONS = {
  habits: { label: 'Habits', sync: true },
  habitAnnotations: { label: 'Habit annotations', sync: true },
  goals: { label: 'Goals', sync: true },
  training: { label: 'Training sessions', sync: true },
  programmes: { label: 'Training programmes', sync: true },
  education: { label: 'Education items', sync: true },
  financeTransactions: { label: 'Finance transactions', sync: true },
  monthlyBudgets: { label: 'Monthly budgets', sync: true },
  transactionImportBatches: { label: 'Transaction import batches', sync: true },
  categorizationRules: { label: 'Categorization rules', sync: true },
  dailyHighlights: { label: 'Daily highlights', sync: true },
  dailyCheckins: { label: 'Daily check-ins', sync: true },
  monthlyReviews: { label: 'Monthly reviews', sync: true },
}

export function isSyncableStore(key) {
  return STORE_DEFINITIONS[key]?.sync === true
}
