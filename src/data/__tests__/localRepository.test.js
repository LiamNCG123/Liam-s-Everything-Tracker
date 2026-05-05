import { beforeEach, describe, expect, it } from 'vitest'
import { localRepository } from '../localRepository'
import { loadSyncQueue, resetSyncQueue } from '../syncQueue'

function createLocalStorageMock() {
  const store = new Map()

  return {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('localRepository', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock()
    resetSyncQueue()
  })

  it('stores and lists records through the repository', () => {
    const record = localRepository.buildInsert({ name: 'Read' })

    localRepository.replaceAll('habits', [record])

    expect(localRepository.list('habits')).toEqual([record])
  })

  it('notifies subscribers when a store changes', async () => {
    const record = localRepository.buildInsert({ name: 'Train' })
    const events = []
    const unsubscribe = localRepository.subscribe('habits', records => events.push(records))

    localRepository.replaceAll('habits', [record])
    await new Promise(resolve => setTimeout(resolve, 0))

    unsubscribe()
    expect(events).toEqual([[record]])
  })

  it('queues mutations for syncable stores', () => {
    const record = localRepository.buildInsert({ name: 'Save money' })

    localRepository.queueMutation('goals', {
      op: 'upsert',
      recordId: record.id,
      record,
    })

    expect(loadSyncQueue()).toMatchObject([
      {
        storeKey: 'goals',
        op: 'upsert',
        recordId: record.id,
        record,
      },
    ])
  })

  it('does not queue mutations for unknown stores', () => {
    const queued = localRepository.queueMutation('unknownStore', {
      op: 'upsert',
      recordId: '1',
      record: { id: '1' },
    })

    expect(queued).toBeNull()
    expect(loadSyncQueue()).toEqual([])
  })
})
