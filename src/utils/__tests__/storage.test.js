/**
 * Storage utilities — unit tests for pure helper functions.
 */
import { describe, it, expect } from 'vitest'
import { fmtDate, daysBetween, today, uid, dateToStr } from '../storage.js'

describe('today()', () => {
  it('returns a string matching YYYY-MM-DD', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches the current local date', () => {
    expect(today()).toBe(dateToStr(new Date()))
  })
})

describe('uid()', () => {
  it('returns a non-empty string', () => {
    expect(typeof uid()).toBe('string')
    expect(uid().length).toBeGreaterThan(0)
  })

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, uid))
    expect(ids.size).toBe(100)
  })
})

describe('fmtDate()', () => {
  it('formats a YYYY-MM-DD date string', () => {
    // en-AU locale: "1 Mar 2024"
    const result = fmtDate('2024-03-01')
    expect(result).toContain('2024')
    expect(result).toContain('Mar')
    expect(result).toContain('1')
  })

  it('returns "—" for falsy input', () => {
    expect(fmtDate('')).toBe('—')
    expect(fmtDate(null)).toBe('—')
    expect(fmtDate(undefined)).toBe('—')
  })
})

describe('daysBetween()', () => {
  it('returns 0 for same date', () => {
    expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0)
  })

  it('returns 1 for consecutive days', () => {
    expect(daysBetween('2024-01-01', '2024-01-02')).toBe(1)
  })

  it('returns 30 for a month apart (Jan → Feb in leap year)', () => {
    expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30)
  })

  it('returns a negative value when b < a', () => {
    expect(daysBetween('2024-01-10', '2024-01-01')).toBe(-9)
  })
})
