/**
 * Categorization engine — automated tests
 * Covers section 4b (category inference) and CSV import categorization (section 5a).
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeDescription,
  buildRule,
  matchTransaction,
  categorize,
  categorizeAll,
  DEFAULT_COMPILED_RULES,
} from '../categorization.js'

// ─── normalizeDescription ─────────────────────────────────────────────────────

describe('normalizeDescription', () => {
  it('maps "ICA Kvantum Farsta" → "ICA"', () => {
    expect(normalizeDescription('ICA Kvantum Farsta')).toBe('ICA')
  })

  it('maps "Woolworths Metro" → "Woolworths"', () => {
    expect(normalizeDescription('Woolworths Metro')).toBe('Woolworths')
  })

  it('maps "Coles Express" → "Coles"', () => {
    expect(normalizeDescription('Coles Express')).toBe('Coles')
  })

  it('passes through unknown merchants unchanged', () => {
    expect(normalizeDescription('Some Random Shop')).toBe('Some Random Shop')
  })

  it('handles empty string', () => {
    expect(normalizeDescription('')).toBe('')
  })

  it('handles null/undefined', () => {
    expect(normalizeDescription(null)).toBe('')
    expect(normalizeDescription(undefined)).toBe('')
  })
})

// ─── buildRule ────────────────────────────────────────────────────────────────

describe('buildRule', () => {
  const rule = buildRule({
    category: 'Groceries',
    type: 'expense',
    anywhere: ['Woolworths', 'Coles'],
    keywords: ['supermarket'],
    prefixes: ['IGA'],
  })

  it('matches anywhere pattern (confidence 0.95)', () => {
    expect(rule.match('payment to Woolworths online')).toBe(0.95)
  })

  it('matches keywords pattern (confidence 0.85)', () => {
    expect(rule.match('local supermarket purchase')).toBe(0.85)
  })

  it('matches prefix pattern (confidence 0.90)', () => {
    expect(rule.match('IGA Strathfield')).toBe(0.90)
  })

  it('returns null for non-matching text', () => {
    expect(rule.match('Netflix monthly billing')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(rule.match('WOOLWORTHS METRO')).toBe(0.95)
  })
})

// ─── matchTransaction ─────────────────────────────────────────────────────────

describe('matchTransaction (default rules)', () => {
  const cases = [
    // Income
    ['salary payment direct credit', 'Salary',        'income'],
    ['freelance invoice payment',    'Freelance',      'income'],
    ['dividend reinvestment',        'Investment Income', 'income'],
    ['refund from merchant',         'Refund',         'income'],
    ['cashback reward',              'Refund',         'income'],
    // Expense — major merchants
    ['woolworths metro',             'Groceries',      'expense'],
    ['coles express checkout',       'Groceries',      'expense'],
    ['netflix',                      'Subscriptions',  'expense'],
    ['spotify',                      'Subscriptions',  'expense'],
    ['uber eats order',              'Eating Out',     'expense'],
    ['mcdonalds',                    'Eating Out',     'expense'],
    ['uber trip',                    'Transport',      'expense'],
    ['chemist warehouse',            'Health',         'expense'],
    ['rent payment landlord',        'Rent/Housing',   'expense'],
    ['amazon purchase',              'Shopping',       'expense'],
    ['f45 training membership',      'Fitness',        'expense'],
  ]

  it.each(cases)('"%s" → %s (%s)', (desc, expectedCat, expectedType) => {
    const result = matchTransaction(desc.toLowerCase(), DEFAULT_COMPILED_RULES)
    expect(result).not.toBeNull()
    expect(result.category).toBe(expectedCat)
    expect(result.type).toBe(expectedType)
  })

  it('returns null for unrecognised description', () => {
    expect(matchTransaction('xyzzy unrecognised 99', DEFAULT_COMPILED_RULES)).toBeNull()
  })
})

// ─── categorize ───────────────────────────────────────────────────────────────

describe('categorize', () => {
  it('categorizes Woolworths as Groceries/expense', () => {
    const result = categorize({ description: 'Woolworths', rawDescription: 'Woolworths' })
    expect(result.category).toBe('Groceries')
    expect(result.type).toBe('expense')
    expect(result.categorizationSource).toBe('rule')
    expect(result.confidenceScore).toBeGreaterThan(0)
  })

  it('categorizes Salary as Salary/income', () => {
    const result = categorize({ description: 'salary payment', rawDescription: 'salary payment' })
    expect(result.category).toBe('Salary')
    expect(result.type).toBe('income')
  })

  it('returns confidenceScore=0 for unknown description', () => {
    const result = categorize({ description: 'ZXQW999 Unknown', rawDescription: 'ZXQW999 Unknown' })
    expect(result.confidenceScore).toBe(0)
    expect(result.categorizationSource).toBe('unknown')
  })

  it('custom rules take priority over default rules', () => {
    const customRule = buildRule({
      category: 'Eating Out',
      type: 'expense',
      anywhere: ['morning brew'],
    })
    // With custom rule — should be Eating Out
    const after = categorize(
      { description: 'Morning brew', rawDescription: 'Morning brew' },
      [customRule]
    )
    expect(after.category).toBe('Eating Out')
    expect(after.type).toBe('expense')
  })

  it('preserves existing tx fields', () => {
    const tx = { id: 'abc', description: 'Netflix', rawDescription: 'Netflix', amount: 15 }
    const result = categorize(tx)
    expect(result.id).toBe('abc')
    expect(result.amount).toBe(15)
  })
})

// ─── categorizeAll ────────────────────────────────────────────────────────────

describe('categorizeAll — CSV import batch (section 5a)', () => {
  const batch = [
    { description: 'Woolworths',        rawDescription: 'Woolworths',        type: 'expense' },
    { description: 'salary',            rawDescription: 'salary',            type: 'income'  },
    { description: 'Netflix',           rawDescription: 'Netflix',           type: 'expense' },
    { description: 'Random coffee shop',rawDescription: 'Random coffee shop',type: 'expense' },
  ]

  it('categorizes a batch of 4 transactions correctly', () => {
    const results = categorizeAll(batch)
    expect(results).toHaveLength(4)
    expect(results[0].category).toBe('Groceries')
    expect(results[1].category).toBe('Salary')
    expect(results[2].category).toBe('Subscriptions')
    expect(results[3].category).toBe('Eating Out')
  })
})
