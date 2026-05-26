import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSyncedMutations,
  enqueueMutation,
  getSyncClientId,
  loadSyncQueue,
  resetSyncQueue,
} from '../syncQueue'

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('loadSyncQueue()', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
  })

  it('returns empty array when nothing has been enqueued', () => {
    expect(loadSyncQueue()).toEqual([])
  })
})

describe('enqueueMutation()', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
  })

  it('returns a queued mutation with generated id, clientId, and queuedAt', () => {
    const result = enqueueMutation({ storeKey: 'habits', recordId: 'r1', op: 'upsert', record: { id: 'r1' } })

    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
    expect(typeof result.clientId).toBe('string')
    expect(result.clientId.length).toBeGreaterThan(0)
    expect(result.queuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.storeKey).toBe('habits')
    expect(result.recordId).toBe('r1')
    expect(result.op).toBe('upsert')
  })

  it('persists the mutation so loadSyncQueue returns it', () => {
    const mut = enqueueMutation({ storeKey: 'goals', recordId: 'g1', op: 'upsert', record: { id: 'g1' } })
    expect(loadSyncQueue()).toContainEqual(mut)
  })

  it('preserves insertion order for multiple mutations', () => {
    enqueueMutation({ storeKey: 'habits', recordId: 'h1', op: 'upsert', record: {} })
    enqueueMutation({ storeKey: 'goals', recordId: 'g1', op: 'delete' })
    enqueueMutation({ storeKey: 'training', recordId: 't1', op: 'upsert', record: {} })

    const queue = loadSyncQueue()
    expect(queue).toHaveLength(3)
    expect(queue[0].storeKey).toBe('habits')
    expect(queue[1].storeKey).toBe('goals')
    expect(queue[2].storeKey).toBe('training')
  })

  it('generates unique ids across mutations', () => {
    const ids = Array.from({ length: 50 }, () =>
      enqueueMutation({ storeKey: 'habits', recordId: 'r1', op: 'delete' }).id
    )
    expect(new Set(ids).size).toBe(50)
  })

  it('caps the queue at MAX_QUEUE_ITEMS (1000)', () => {
    for (let i = 0; i < 1005; i++) {
      enqueueMutation({ storeKey: 'habits', recordId: `r${i}`, op: 'delete' })
    }
    expect(loadSyncQueue().length).toBe(1000)
  })
})

describe('clearSyncedMutations()', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
  })

  it('removes only the mutations matching the given IDs', () => {
    const m1 = enqueueMutation({ storeKey: 'habits', recordId: 'h1', op: 'upsert', record: {} })
    const m2 = enqueueMutation({ storeKey: 'goals', recordId: 'g1', op: 'upsert', record: {} })
    const m3 = enqueueMutation({ storeKey: 'training', recordId: 't1', op: 'delete' })

    clearSyncedMutations([m1.id, m3.id])

    const queue = loadSyncQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(m2.id)
  })

  it('is a no-op for an empty IDs array', () => {
    enqueueMutation({ storeKey: 'habits', recordId: 'h1', op: 'upsert', record: {} })
    clearSyncedMutations([])
    expect(loadSyncQueue()).toHaveLength(1)
  })

  it('is a no-op for null', () => {
    enqueueMutation({ storeKey: 'habits', recordId: 'h1', op: 'upsert', record: {} })
    clearSyncedMutations(null)
    expect(loadSyncQueue()).toHaveLength(1)
  })

  it('is a no-op for undefined', () => {
    enqueueMutation({ storeKey: 'habits', recordId: 'h1', op: 'upsert', record: {} })
    clearSyncedMutations(undefined)
    expect(loadSyncQueue()).toHaveLength(1)
  })
})

describe('resetSyncQueue()', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
  })

  it('empties a populated queue', () => {
    enqueueMutation({ storeKey: 'habits', recordId: 'h1', op: 'upsert', record: {} })
    enqueueMutation({ storeKey: 'goals', recordId: 'g1', op: 'delete' })

    resetSyncQueue()

    expect(loadSyncQueue()).toEqual([])
  })

  it('is a no-op on an already empty queue', () => {
    resetSyncQueue()
    expect(loadSyncQueue()).toEqual([])
  })
})

describe('getSyncClientId()', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
  })

  it('returns a non-empty string', () => {
    const id = getSyncClientId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns the same ID on subsequent calls (stable across calls)', () => {
    const first = getSyncClientId()
    const second = getSyncClientId()
    expect(first).toBe(second)
  })
})
