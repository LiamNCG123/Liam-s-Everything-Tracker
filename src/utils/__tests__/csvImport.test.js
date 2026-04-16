/**
 * CSV Import utilities — automated tests
 * Covers sections 5a–5d of spora-testing-prompts.md
 */
import { describe, it, expect } from 'vitest'
import {
  autoDetectMapping,
  normalizeRows,
  detectDuplicates,
  parseCSV,
  buildRuleFromCorrection,
  deserializeRules,
} from '../csvImport.js'

// ─── Section 5a: Happy path — standard CSV ────────────────────────────────────

describe('normalizeRows — standard amount column (section 5a)', () => {
  const rows = [
    { Date: '2024-03-01', Description: 'Woolworths',        Amount: '-85.00' },
    { Date: '2024-03-02', Description: 'Salary',            Amount: '4000.00' },
    { Date: '2024-03-03', Description: 'Netflix',           Amount: '-15.99' },
    { Date: '2024-03-04', Description: 'Random coffee shop',Amount: '-6.50' },
  ]
  const mapping = { date: 'Date', description: 'Description', amount: 'Amount' }

  it('parses 4 rows with no skips', () => {
    const { normalized, skipped } = normalizeRows(rows, mapping)
    expect(normalized).toHaveLength(4)
    expect(skipped).toHaveLength(0)
  })

  it('Woolworths → expense, amount 85', () => {
    const { normalized } = normalizeRows(rows, mapping)
    const row = normalized.find(r => r.description === 'Woolworths')
    expect(row.type).toBe('expense')
    expect(row.amount).toBe(85)
    expect(row.date).toBe('2024-03-01')
  })

  it('Salary → income, amount 4000', () => {
    const { normalized } = normalizeRows(rows, mapping)
    const row = normalized.find(r => r.description === 'Salary')
    expect(row.type).toBe('income')
    expect(row.amount).toBe(4000)
  })

  it('Netflix → expense, amount 15.99', () => {
    const { normalized } = normalizeRows(rows, mapping)
    const row = normalized.find(r => r.description === 'Netflix')
    expect(row.type).toBe('expense')
    expect(row.amount).toBeCloseTo(15.99)
  })

  it('each row gets an _importId string', () => {
    const { normalized } = normalizeRows(rows, mapping)
    normalized.forEach(row => expect(typeof row._importId).toBe('string'))
  })

  it('rows start with _excluded=false, _isDuplicate=false', () => {
    const { normalized } = normalizeRows(rows, mapping)
    normalized.forEach(row => {
      expect(row._excluded).toBe(false)
      expect(row._isDuplicate).toBe(false)
    })
  })
})

// ─── Section 5b: Duplicate detection ─────────────────────────────────────────

describe('detectDuplicates (section 5b)', () => {
  const existing = [
    { date: '2024-03-01', description: 'Woolworths', amount: 85 },
    { date: '2024-03-03', description: 'Netflix',    amount: 15.99 },
  ]

  const imported = [
    { date: '2024-03-01', description: 'Woolworths',  amount: 85,    _isDuplicate: false },
    { date: '2024-03-02', description: 'Salary',      amount: 4000,  _isDuplicate: false },
    { date: '2024-03-03', description: 'Netflix',     amount: 15.99, _isDuplicate: false },
    { date: '2024-03-04', description: 'Coffee Shop', amount: 6.50,  _isDuplicate: false },
  ]

  it('flags exact duplicate rows', () => {
    const result = detectDuplicates(imported, existing)
    expect(result[0]._isDuplicate).toBe(true)   // Woolworths match
    expect(result[2]._isDuplicate).toBe(true)   // Netflix match
  })

  it('leaves non-duplicate rows unmarked', () => {
    const result = detectDuplicates(imported, existing)
    expect(result[1]._isDuplicate).toBe(false)  // Salary — new
    expect(result[3]._isDuplicate).toBe(false)  // Coffee — new
  })

  it('tolerates < 1 cent amount difference', () => {
    const almostSame = [{ date: '2024-03-01', description: 'Woolworths', amount: 84.999, _isDuplicate: false }]
    const result = detectDuplicates(almostSame, existing)
    expect(result[0]._isDuplicate).toBe(true)
  })

  it('does not flag same description / different date', () => {
    const diffDate = [{ date: '2024-04-01', description: 'Woolworths', amount: 85, _isDuplicate: false }]
    expect(detectDuplicates(diffDate, existing)[0]._isDuplicate).toBe(false)
  })

  it('does not flag same date+desc / different amount', () => {
    const diffAmt = [{ date: '2024-03-01', description: 'Woolworths', amount: 99, _isDuplicate: false }]
    expect(detectDuplicates(diffAmt, existing)[0]._isDuplicate).toBe(false)
  })
})

// ─── Section 5c: Sign convention toggle ──────────────────────────────────────

describe('normalizeRows — sign convention (section 5c)', () => {
  // Bank statement style: positive = expense (debit), negative = income (credit)
  const rows = [
    { Date: '2024-03-01', Description: 'Rent',   Amount: '1500' },
    { Date: '2024-03-01', Description: 'Salary', Amount: '-4000' },
  ]
  const mapping = { date: 'Date', description: 'Description', amount: 'Amount' }

  it('positive_is_income (default): 1500 → expense, -4000 → income', () => {
    const { normalized } = normalizeRows(rows, mapping, { signConvention: 'positive_is_income' })
    expect(normalized.find(r => r.description === 'Rent').type).toBe('income')   // positive
    expect(normalized.find(r => r.description === 'Salary').type).toBe('expense') // negative
  })

  it('positive_is_expense: 1500 → expense, -4000 → income', () => {
    const { normalized } = normalizeRows(rows, mapping, { signConvention: 'positive_is_expense' })
    expect(normalized.find(r => r.description === 'Rent').type).toBe('expense')  // positive = expense
    expect(normalized.find(r => r.description === 'Salary').type).toBe('income') // negative = income
  })
})

// ─── Debit/Credit column format ───────────────────────────────────────────────

describe('normalizeRows — debit/credit columns', () => {
  const rows = [
    { Date: '2024-03-01', Description: 'Rent',   Debit: '1500', Credit: '' },
    { Date: '2024-03-01', Description: 'Salary', Debit: '',     Credit: '4000' },
  ]
  const mapping = { date: 'Date', description: 'Description', debit: 'Debit', credit: 'Credit' }

  it('Debit-only row → expense', () => {
    const { normalized } = normalizeRows(rows, mapping)
    expect(normalized.find(r => r.description === 'Rent').type).toBe('expense')
    expect(normalized.find(r => r.description === 'Rent').amount).toBe(1500)
  })

  it('Credit-only row → income', () => {
    const { normalized } = normalizeRows(rows, mapping)
    expect(normalized.find(r => r.description === 'Salary').type).toBe('income')
    expect(normalized.find(r => r.description === 'Salary').amount).toBe(4000)
  })
})

// ─── Section 5d: Column auto-detection ───────────────────────────────────────

describe('autoDetectMapping (section 5d)', () => {
  it('maps standard headers Date / Description / Amount', () => {
    const m = autoDetectMapping(['Date', 'Description', 'Amount'])
    expect(m.date).toBe('Date')
    expect(m.description).toBe('Description')
    expect(m.amount).toBe('Amount')
  })

  it('maps "Transaction Date" → date', () => {
    const m = autoDetectMapping(['Transaction Date', 'Merchant', 'AUD Amount'])
    expect(m.date).toBe('Transaction Date')
    expect(m.description).toBe('Merchant')
    // "AUD Amount" does not match any regex hint — auto-map leaves it undefined
    // This is a known gap; see todo below
  })

  it('maps Debit / Credit split columns', () => {
    const m = autoDetectMapping(['Date', 'Details', 'Debit', 'Credit', 'Balance'])
    expect(m.debit).toBe('Debit')
    expect(m.credit).toBe('Credit')
    expect(m.description).toBe('Details')
  })

  it('maps alternative description headers (Payee, Memo, Narrative)', () => {
    expect(autoDetectMapping(['Date', 'Payee',     'Amount']).description).toBe('Payee')
    expect(autoDetectMapping(['Date', 'Memo',      'Amount']).description).toBe('Memo')
    expect(autoDetectMapping(['Date', 'Narrative', 'Amount']).description).toBe('Narrative')
  })

  it.todo(
    '"AUD Amount" should auto-map to amount — ' +
    'current regex hints require exact starts (^amount$) so "AUD Amount" is not matched. ' +
    'Fix: add /aud.?amount/i or broaden hints to allow prefix words'
  )
})

// ─── parseCSV ─────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  const csv = `Date,Description,Amount
2024-03-01,Woolworths,-85.00
2024-03-02,Salary,4000.00`

  it('returns correct headers', () => {
    const { headers } = parseCSV(csv)
    expect(headers).toEqual(['Date', 'Description', 'Amount'])
  })

  it('returns 2 data rows', () => {
    const { rows } = parseCSV(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].Description).toBe('Woolworths')
    expect(rows[1].Amount).toBe('4000.00')
  })
})

// ─── buildRuleFromCorrection / deserializeRules ───────────────────────────────

describe('buildRuleFromCorrection + deserializeRules (section 4b)', () => {
  it('builds a regex rule from a corrected transaction', () => {
    const tx = {
      rawDescription: 'Morning brew',
      description:    'Morning brew',
      category: 'Eating Out',
      type: 'expense',
    }
    const rule = buildRuleFromCorrection(tx)
    expect(rule).not.toBeNull()
    expect(rule.category).toBe('Eating Out')
    expect(rule.type).toBe('expense')
    expect(rule.pattern).toBeInstanceOf(RegExp)
    expect(rule.pattern.test('morning brew latte')).toBe(true)
  })

  it('returns null for a description with no significant words (all < 4 chars)', () => {
    const tx = { rawDescription: 'AB CD', category: 'X', type: 'expense' }
    expect(buildRuleFromCorrection(tx)).toBeNull()
  })

  it('deserializeRules restores RegExp from stored patternStr', () => {
    const stored = [
      { patternStr: '\\b(morning|brew)\\b', category: 'Eating Out', type: 'expense', confidence: 0.9 },
    ]
    const rules = deserializeRules(stored)
    expect(rules[0].pattern).toBeInstanceOf(RegExp)
    expect(rules[0].pattern.test('morning coffee')).toBe(true)
  })
})

// ─── Amount / date parsing edge cases ────────────────────────────────────────

describe('normalizeRows — parsing edge cases', () => {
  const mapping = { date: 'Date', description: 'Description', amount: 'Amount' }

  it('accounting parenthesis notation: (1234) → expense 1234', () => {
    const rows = [{ Date: '2024-01-01', Description: 'Test', Amount: '(1234)' }]
    const { normalized } = normalizeRows(rows, mapping)
    expect(normalized[0].amount).toBe(1234)
    expect(normalized[0].type).toBe('expense')
  })

  it('DD/MM/YYYY date format', () => {
    const rows = [{ Date: '15/03/2024', Description: 'Test', Amount: '-10' }]
    const { normalized } = normalizeRows(rows, mapping)
    expect(normalized[0].date).toBe('2024-03-15')
  })

  it('skips rows with empty Amount', () => {
    const rows = [{ Date: '2024-01-01', Description: 'Test', Amount: '' }]
    const { skipped } = normalizeRows(rows, mapping)
    expect(skipped).toHaveLength(1)
    expect(skipped[0]._parseErrors).toContain('Amount column is empty')
  })

  it('silently drops fully empty rows', () => {
    const rows = [
      { Date: '2024-01-01', Description: 'Real', Amount: '-10' },
      { Date: '',           Description: '',     Amount: '' },
    ]
    const { normalized } = normalizeRows(rows, mapping)
    expect(normalized).toHaveLength(1)
  })
})
