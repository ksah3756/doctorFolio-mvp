'use client'

import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

export interface UiState {
  isClientReady: boolean
  markClientReady: () => void
  resetClientReady: () => void
}

export type UiStore = StoreApi<UiState>

export function createUiStore(): UiStore {
  return createStore<UiState>()((set) => ({
    isClientReady: false,
    markClientReady: () => set({ isClientReady: true }),
    resetClientReady: () => set({ isClientReady: false }),
  }))
}

export const uiStore = createUiStore()

export function useUiStore<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector)
}
