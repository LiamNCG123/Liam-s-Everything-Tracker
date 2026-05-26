import { describe, expect, it } from 'vitest'
import { isSyncableStore, STORE_DEFINITIONS } from '../storeRegistry'

describe('STORE_DEFINITIONS', () => {
  it('has at least one entry', () => {
    expect(Object.keys(STORE_DEFINITIONS).length).toBeGreaterThan(0)
  })

  it('all entries have sync: true', () => {
    for (const [key, def] of Object.entries(STORE_DEFINITIONS)) {
      expect(def.sync, `expected ${key} to have sync: true`).toBe(true)
    }
  })

  it('all entries have a non-empty label', () => {
    for (const [key, def] of Object.entries(STORE_DEFINITIONS)) {
      expect(typeof def.label, `expected ${key}.label to be a string`).toBe('string')
      expect(def.label.length, `expected ${key}.label to be non-empty`).toBeGreaterThan(0)
    }
  })
})

describe('isSyncableStore()', () => {
  it('returns true for each declared store', () => {
    for (const key of Object.keys(STORE_DEFINITIONS)) {
      expect(isSyncableStore(key), `expected ${key} to be syncable`).toBe(true)
    }
  })

  it('returns false for an unknown store key', () => {
    expect(isSyncableStore('unknownStore')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isSyncableStore('')).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSyncableStore(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSyncableStore(null)).toBe(false)
  })

  it('recognises habits as syncable', () => {
    expect(isSyncableStore('habits')).toBe(true)
  })

  it('recognises financeTransactions as syncable', () => {
    expect(isSyncableStore('financeTransactions')).toBe(true)
  })

  it('recognises dailyCheckins as syncable', () => {
    expect(isSyncableStore('dailyCheckins')).toBe(true)
  })
})
