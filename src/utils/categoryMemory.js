/**
 * Category memory — learns description → category mappings from user corrections
 * so the Finance modal can auto-suggest the right category next time.
 *
 * Storage key: let_categoryMemory  →  { [descriptionLower]: categoryName }
 */
import { load, save } from './storage'

const KEY = 'categoryMemory'

/** Call when the user saves a transaction to record the mapping. */
export function learnCategory(description, category) {
  if (!description?.trim() || !category) return
  const map = load(KEY) || {}
  map[description.trim().toLowerCase()] = category
  save(KEY, map)
}

/**
 * Returns the remembered category for a description, or null.
 * Tries exact match first, then substring containment (min 4 chars).
 */
export function recallCategory(description) {
  if (!description?.trim()) return null
  const lower = description.trim().toLowerCase()
  const map   = load(KEY) || {}

  // 1. Exact match
  if (map[lower]) return map[lower]

  // 2. Stored key is contained in the description (e.g. "spotify" in "spotify premium")
  for (const [k, cat] of Object.entries(map)) {
    if (k.length >= 4 && lower.includes(k)) return cat
  }

  // 3. Description is contained in a stored key (e.g. "star" in "starbucks")
  for (const [k, cat] of Object.entries(map)) {
    if (lower.length >= 4 && k.includes(lower)) return cat
  }

  return null
}
