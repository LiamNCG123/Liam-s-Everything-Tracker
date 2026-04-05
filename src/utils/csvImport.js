/**
 * CSV Import utilities
 * - CSV parsing (via PapaParse)
 * - Column auto-detection
 * - Row normalization
 * - Duplicate detection
 *
 * Categorization is handled by src/utils/categorization.js
 */

import Papa from 'papaparse'
import { uid, today } from './storage'
export { categorize, categorizeAll } from './categorization'

// ─── Column name detection ────────────────────────────────────────────────────

const COLUMN_HINTS = {
  date: [
    /^date$/i, /^transaction.?date$/i, /^value.?date$/i, /^booking.?date$/i,
    /^posted.?date$/i, /^settlement.?date$/i, /^created.?at$/i, /^time$/i,
  ],
  description: [
    /^description$/i, /^details$/i, /^narrative$/i, /^memo$/i, /^particulars$/i,
    /^merchant$/i, /^payee$/i, /^reference$/i, /^transactions$/i, /^text$/i,
    /^name$/i, /^label$/i, /^counterpart(?:y)?$/i,
  ],
  amount: [
    /^amount$/i, /^value$/i, /^sum$/i, /^transaction.?amount$/i, /^net.?amount$/i,
    /^amt$/i,
  ],
  debit: [
    /^debit$/i, /^debit.?amount$/i, /^withdrawal$/i, /^money.?out$/i, /^dr\.?$/i,
    /^payment$/i, /^paid.?out$/i, /^out$/i,
  ],
  credit: [
    /^credit$/i, /^credit.?amount$/i, /^deposit$/i, /^money.?in$/i, /^cr\.?$/i,
    /^received$/i, /^paid.?in$/i, /^in$/i,
  ],
  balance: [
    /^balance$/i, /^running.?balance$/i, /^closing.?balance$/i, /^ledger.?balance$/i,
  ],
  account: [
    /^account$/i, /^account.?name$/i, /^account.?no$/i, /^account.?number$/i,
    /^from.?account$/i, /^to.?account$/i,
  ],
  currency: [
    /^currency$/i, /^ccy$/i, /^cur$/i,
  ],
  reference: [
    /^ref(?:erence)?(?:\.?no)?$/i, /^ref\.?id$/i, /^transaction.?ref$/i,
    /^trans(?:action)?.?id$/i, /^cheque.?no$/i, /^check.?no$/i, /^receipt.?no$/i,
    /^order.?(?:id|no)$/i, /^external.?id$/i,
  ],
}

export function autoDetectMapping(headers) {
  const mapping = {}
  const used = new Set()

  for (const [field, hints] of Object.entries(COLUMN_HINTS)) {
    for (const header of headers) {
      if (used.has(header)) continue
      if (hints.some(h => h.test(header.trim()))) {
        mapping[field] = header
        used.add(header)
        break
      }
    }
  }

  return mapping
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

/**
 * Returns { value: 'YYYY-MM-DD', warned: bool }
 * warned=true means we fell back to today() and should flag the row.
 */
function parseDate(raw) {
  if (!raw || String(raw).trim() === '') return { value: today(), warned: true }
  const s = String(raw).trim()

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return { value: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`, warned: false }

  // DD/MM/YYYY or DD-MM-YYYY (Australian/UK)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (m) {
    const mon = parseInt(m[2])
    if (mon > 12) {
      // Looks like MM/DD — swap
      return { value: `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`, warned: false }
    }
    return { value: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, warned: false }
  }

  // DD MMM YYYY or DD-MMM-YYYY
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})/)
  if (m) {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
    const mon = months[m[2].toLowerCase().slice(0, 3)]
    if (mon) {
      const yr = m[3].length === 2 ? '20' + m[3] : m[3]
      return { value: `${yr}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`, warned: false }
    }
  }

  // Try native Date parse as fallback
  const d = new Date(s)
  if (!isNaN(d)) return { value: d.toISOString().slice(0, 10), warned: false }

  // Could not parse — fall back to today and warn
  return { value: today(), warned: true }
}

// ─── Amount parsing ───────────────────────────────────────────────────────────

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return 0
  const s = String(raw).trim()
    .replace(/[$€£¥₹,\s]/g, '')   // strip currency symbols and thousands separators
    .replace(/\((.+)\)/, '-$1')    // (1234) → -1234 (accounting negative)
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// ─── Row normalization ────────────────────────────────────────────────────────

/**
 * @param {object[]} rows      - raw CSV row objects (header: value)
 * @param {object}   mapping   - { date, description, amount, debit, credit, reference, ... }
 * @param {object}   options   - { signConvention: 'positive_is_income'|'positive_is_expense', importBatchId }
 * @returns {{ normalized: object[], skipped: object[] }}
 *   normalized — valid rows ready for review
 *   skipped    — rows that could not be parsed, each with a _parseErrors string[]
 */
export function normalizeRows(rows, mapping, options = {}) {
  const { signConvention = 'positive_is_income', importBatchId = uid() } = options
  const normalized = []
  const skipped    = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row    = rows[rowIndex]
    const errors = []   // validation messages for this row
    const warns  = []   // non-fatal warnings

    // ── Description ───────────────────────────────────────────────────────────
    const descRaw   = mapping.description ? row[mapping.description] : ''
    const description = String(descRaw || '').trim()

    // ── Date ──────────────────────────────────────────────────────────────────
    const dateRaw = mapping.date ? row[mapping.date] : ''
    const { value: date, warned: dateWarned } = parseDate(dateRaw)
    if (dateWarned) {
      if (!dateRaw || String(dateRaw).trim() === '') {
        warns.push('Date is empty — defaulted to today')
      } else {
        warns.push(`Date "${dateRaw}" could not be parsed — defaulted to today`)
      }
    }

    // ── Amount ────────────────────────────────────────────────────────────────
    let amount = null
    let type   = 'expense'

    if (mapping.debit && mapping.credit) {
      const debitRaw  = row[mapping.debit]
      const creditRaw = row[mapping.credit]
      const debit     = parseAmount(debitRaw)
      const credit    = parseAmount(creditRaw)

      if (!debitRaw && !creditRaw) {
        errors.push('Both debit and credit columns are empty')
      } else if (credit && !debit) {
        amount = Math.abs(credit); type = 'income'
      } else if (debit && !credit) {
        amount = Math.abs(debit); type = 'expense'
      } else if (credit > debit) {
        amount = credit - debit; type = 'income'
      } else {
        amount = debit - credit; type = 'expense'
      }
    } else if (mapping.amount) {
      const rawVal = row[mapping.amount]
      if (!rawVal || String(rawVal).trim() === '') {
        errors.push('Amount column is empty')
      } else {
        const parsed = parseAmount(rawVal)
        if (isNaN(parsed)) {
          errors.push(`Amount "${rawVal}" is not a valid number`)
        } else {
          amount = Math.abs(parsed)
          if (signConvention === 'positive_is_income') {
            type = parsed >= 0 ? 'income' : 'expense'
          } else {
            type = parsed <= 0 ? 'income' : 'expense'
          }
        }
      }
    } else {
      // No amount mapping at all — only valid if both debit+credit were set
      errors.push('No amount column mapped')
    }

    // ── Empty row check ───────────────────────────────────────────────────────
    const allEmpty = Object.values(row).every(v => !v || String(v).trim() === '')
    if (allEmpty) {
      // Silently drop fully empty rows (common at end of CSV)
      continue
    }

    // ── Zero-amount check ─────────────────────────────────────────────────────
    if (amount === 0 && !description) {
      // Nothing useful — skip silently
      continue
    }

    // ── Route to skipped or normalized ───────────────────────────────────────
    if (errors.length > 0) {
      skipped.push({
        _importId:    uid(),
        _rowIndex:    rowIndex + 1,
        _parseErrors: errors,
        _parseWarns:  warns,
        rawRowData:   row,
        date,
        description,
        amount: amount ?? 0,
        type,
        _excluded: true,  // skipped rows start excluded
      })
      continue
    }

    normalized.push({
      _importId:    uid(),
      _rowIndex:    rowIndex + 1,
      _parseWarns:  warns,   // non-fatal — row included but flagged
      date,
      description,
      rawDescription: description,
      amount:       amount ?? 0,
      type,
      category:     'Uncategorized',
      subcategory:  '',
      account:      mapping.account   ? String(row[mapping.account]   || '').trim() : '',
      currency:     mapping.currency  ? String(row[mapping.currency]  || '').trim() : '',
      reference:    mapping.reference ? String(row[mapping.reference] || '').trim() : '',
      source:       'csv_import',
      notes:        '',
      importBatchId,
      rawRowData:   row,
      confidenceScore:      0,
      categorizationSource: 'unknown',
      _excluded:    false,
      _isDuplicate: false,
    })
  }

  return { normalized, skipped }
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

/**
 * A duplicate is likely if an existing transaction shares:
 *   - the same date
 *   - the same amount (within 1 cent)
 *   - similar description (first 20 chars match after normalization)
 */
export function detectDuplicates(importedRows, existingTransactions) {
  const normalize = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)

  return importedRows.map(row => {
    const isDup = existingTransactions.some(ex =>
      ex.date === row.date &&
      Math.abs(Number(ex.amount) - row.amount) < 0.01 &&
      normalize(ex.description) === normalize(row.description)
    )
    return { ...row, _isDuplicate: isDup }
  })
}

// ─── CSV parsing ─────────────────────────────────────────────────────────────

/**
 * Parse CSV text → { headers: string[], rows: object[] }
 */
export function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
    dynamicTyping: false,  // keep everything as string — we parse manually
  })

  const headers = result.meta?.fields ?? []
  const rows    = result.data ?? []

  return { headers, rows, errors: result.errors }
}

// ─── Categorization rule from manual correction ───────────────────────────────

/**
 * Build a simple rule from a user-corrected transaction.
 * Uses first significant "word" (4+ chars) of the description as the pattern.
 */
export function buildRuleFromCorrection(tx) {
  const words = tx.rawDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4)

  if (!words.length) return null

  // Use up to first 2 significant words for a targeted but not too-narrow pattern
  const keyword = words.slice(0, 2).join('|')

  return {
    id: uid(),
    pattern:    new RegExp(`\\b(${keyword})\\b`, 'i'),
    patternStr: `\\b(${keyword})\\b`,  // stored as string for serialization
    category:   tx.category,
    type:       tx.type,
    confidence: 0.9,
    source:     'manual',
    createdFrom: tx.rawDescription,
    createdAt:  new Date().toISOString(),
  }
}

/**
 * Deserialize stored rules (pattern is saved as patternStr string).
 */
export function deserializeRules(stored) {
  return (stored || []).map(r => ({
    ...r,
    pattern: new RegExp(r.patternStr, 'i'),
  }))
}
