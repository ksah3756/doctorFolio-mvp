import { describe, expect, it } from 'vitest'
import { createUiStore } from './uiStore'

describe('uiStore', () => {
  it('keeps client readiness as global UI state only', () => {
    const store = createUiStore()

    expect(store.getState().isClientReady).toBe(false)

    store.getState().markClientReady()
    expect(store.getState().isClientReady).toBe(true)

    store.getState().resetClientReady()
    expect(store.getState().isClientReady).toBe(false)
  })
})
