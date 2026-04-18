/**
 * QuickAdd Parser — automated tests
 * Covers sections 1a–1g of spora-testing-prompts.md
 */
import { describe, it, expect } from 'vitest'
import { parse, INTENT } from '../quickAddParser.js'

// ─── Section 1a: Finance / Expenses ──────────────────────────────────────────

describe('Finance / Expenses (section 1a)', () => {
  const cases = [
    ['coffee 5',        'Eating Out'],
    ['lunch 18.50',     'Eating Out'],
    ['uber 12',         'Transport'],
    ['netflix 15',      'Subscriptions'],
    ['spotify 10.99',   'Subscriptions'],
    ['groceries 80',    'Groceries'],
    ['rent 1500',       'Rent/Housing'],
    ['gym 45',          'Fitness'],
    ['pharmacy 22',     'Health'],
    ['Amazon 65.99',    'Shopping'],
    ['parking 8',       'Transport'],
    ['electricity 120', 'Utilities'],
    ['random stuff 33', 'Misc/Buffer'],
  ]

  it.each(cases)('"%s" → expense / %s', (input, expectedCategory) => {
    const result = parse(input)
    expect(result.type).toBe(INTENT.FINANCE)
    expect(result.finance.txType).toBe('expense')
    expect(result.finance.category).toBe(expectedCategory)
  })
})

// ─── Section 1b: Finance / Income ────────────────────────────────────────────

describe('Finance / Income (section 1b)', () => {
  const cases = [
    ['salary 4000',          'Salary'],
    ['freelance 800',        'Freelance'],
    ['invoice payment 2500', 'Freelance'],
    ['dividend 150',         'Investment Income'],
    ['refund 35',            'Refund'],
    ['cashback 12',          'Refund'],
    ['business income 3000', 'Business Income'],
  ]

  it.each(cases)('"%s" → income / %s', (input, expectedCategory) => {
    const result = parse(input)
    expect(result.type).toBe(INTENT.FINANCE)
    expect(result.finance.txType).toBe('income')
    expect(result.finance.category).toBe(expectedCategory)
  })
})

// ─── Section 1c: Training / Strength ─────────────────────────────────────────

describe('Training / Strength (section 1c)', () => {
  it('bench 80kg 4x8 — weight, sets, reps, unit', () => {
    const { type, training } = parse('bench 80kg 4x8')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.weight).toBe(80)
    expect(training.sets).toBe(4)
    expect(training.reps).toBe(8)
    expect(training.unit).toBe('kg')
  })

  it('squat 100 kg 3x5', () => {
    const { type, training } = parse('squat 100 kg 3x5')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.weight).toBe(100)
    expect(training.sets).toBe(3)
    expect(training.reps).toBe(5)
  })

  it('deadlift 140lbs 1x3 — unit normalised to lbs', () => {
    const { type, training } = parse('deadlift 140lbs 1x3')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.weight).toBe(140)
    expect(training.unit).toBe('lbs')
  })

  it('OHP 60kg 3x10', () => {
    expect(parse('OHP 60kg 3x10').type).toBe(INTENT.TRAINING)
  })

  it('pull-up 3x12 — no weight', () => {
    const { type, training } = parse('pull-up 3x12')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.weight).toBeNull()
    expect(training.sets).toBe(3)
    expect(training.reps).toBe(12)
  })

  it('dip 4x15', () => {
    const { type, training } = parse('dip 4x15')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.sets).toBe(4)
    expect(training.reps).toBe(15)
  })
})

// ─── Section 1d: Training / Cardio ───────────────────────────────────────────

describe('Training / Cardio (section 1d)', () => {
  it('run 30min — isCardio=true', () => {
    const { type, training } = parse('run 30min')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.isCardio).toBe(true)
    expect(training.duration).toMatch(/30/)
  })

  it('bike 45 minutes — isCardio=true', () => {
    const { type, training } = parse('bike 45 minutes')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.isCardio).toBe(true)
  })

  it('cardio 20min — isCardio=true', () => {
    const { type, training } = parse('cardio 20min')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.isCardio).toBe(true)
  })

  it('jog 5km — exercise keyword triggers training + isCardio', () => {
    const { type, training } = parse('jog 5km')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.isCardio).toBe(true)
  })
})

// ─── Section 1e: Education ────────────────────────────────────────────────────

describe('Education (section 1e)', () => {
  it('read 20 pages atomic habits — pages=20', () => {
    const { type, education } = parse('read 20 pages atomic habits')
    expect(type).toBe(INTENT.EDUCATION)
    expect(education.pages).toBe(20)
  })

  it('50 pages — pages=50', () => {
    const { type, education } = parse('50 pages')
    expect(type).toBe(INTENT.EDUCATION)
    expect(education.pages).toBe(50)
  })

  it('podcast 45min — minutes=45', () => {
    const { type, education } = parse('podcast 45min')
    expect(type).toBe(INTENT.EDUCATION)
    expect(education.minutes).toBe(45)
  })

  it('reading deep work — education keyword, no amount', () => {
    expect(parse('reading deep work').type).toBe(INTENT.EDUCATION)
  })

  it('chapter 3 deep work → education', () => {
    expect(parse('chapter 3 deep work').type).toBe(INTENT.EDUCATION)
  })
})

// ─── Section 1f: Habit / done keyword ────────────────────────────────────────

describe('Habit / done keyword (section 1f)', () => {
  it('meditation done', () => {
    expect(parse('meditation done').type).toBe(INTENT.HABIT)
  })

  it('morning walk completed', () => {
    expect(parse('morning walk completed').type).toBe(INTENT.HABIT)
  })

  it('journaling finished', () => {
    expect(parse('journaling finished').type).toBe(INTENT.HABIT)
  })

  it('cold shower did', () => {
    expect(parse('cold shower did').type).toBe(INTENT.HABIT)
  })

  it('gym done — "done" suffix beats exercise keyword (no weight/sets)', () => {
    expect(parse('gym done').type).toBe(INTENT.HABIT)
  })

  it('fuzzy match against context habits', () => {
    const ctx = { habits: [{ id: 'h1', name: 'Meditation' }] }
    const { type, habit } = parse('meditation', ctx)
    expect(type).toBe(INTENT.HABIT)
    expect(habit.matchedId).toBe('h1')
    expect(habit.matchedName).toBe('Meditation')
  })
})

// ─── Section 1g: Edge cases & conflicts ──────────────────────────────────────

describe('Edge cases (section 1g)', () => {
  it('read 5 → finance (bare number wins over education keyword)', () => {
    // "read" is an education keyword but a standalone number → Finance
    expect(parse('read 5').type).toBe(INTENT.FINANCE)
  })

  it('book 20 pages → education', () => {
    const { type, education } = parse('book 20 pages')
    expect(type).toBe(INTENT.EDUCATION)
    expect(education.pages).toBe(20)
  })

  it('gym 45 → finance/Fitness (no weight/duration unit)', () => {
    const result = parse('gym 45')
    expect(result.type).toBe(INTENT.FINANCE)
    expect(result.finance.category).toBe('Fitness')
  })

  it('salary (no amount) → unknown', () => {
    expect(parse('salary').type).toBe(INTENT.UNKNOWN)
  })

  it('empty string → unknown', () => {
    expect(parse('').type).toBe(INTENT.UNKNOWN)
  })

  it('whitespace only → unknown', () => {
    expect(parse('   ').type).toBe(INTENT.UNKNOWN)
  })

  it('run 5 → finance (bare number, no weight/duration unit)', () => {
    const result = parse('run 5')
    expect(result.type).toBe(INTENT.FINANCE)
  })

  it('gym 45min → training/cardio', () => {
    const { type, training } = parse('gym 45min')
    expect(type).toBe(INTENT.TRAINING)
    expect(training.isCardio).toBe(true)
  })
})

// ─── Amount parsing edge cases ────────────────────────────────────────────────

describe('Amount extraction', () => {
  it('decimal amount: coffee 3.50', () => {
    const { finance } = parse('coffee 3.50')
    expect(finance.amount).toBe(3.5)
  })

  it('currency prefix: $50 coffee', () => {
    // dollar sign prefix should not block amount extraction
    const result = parse('coffee $50')
    expect(result.type).toBe(INTENT.FINANCE)
    expect(result.finance.amount).toBe(50)
  })

  it('large amounts: rent 2250.00', () => {
    const { finance } = parse('rent 2250.00')
    expect(finance.amount).toBe(2250)
    expect(finance.category).toBe('Rent/Housing')
  })
})
