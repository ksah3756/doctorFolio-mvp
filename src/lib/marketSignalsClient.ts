'use client'

import { SESSION_KEYS } from './types'
import { type MarketResponse } from './marketSignals'

const MARKET_CACHE_SECONDS = 86_400

interface CachedMarketResponse {
  data: MarketResponse
  savedAt: number
}

export function readMarketCache(): CachedMarketResponse | null {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(SESSION_KEYS.MARKET)
  if (!raw) return null

  try {
    return JSON.parse(raw) as CachedMarketResponse
  } catch {
    return null
  }
}

export async function loadMarketSignals(forceRefresh = false): Promise<MarketResponse> {
  const cached = readMarketCache()
  const now = Date.now()

  if (!forceRefresh && cached && (now - cached.savedAt) < MARKET_CACHE_SECONDS * 1000) {
    return cached.data
  }

  const response = await fetch('/api/market')
  if (!response.ok) {
    throw new Error('market fetch failed')
  }

  const data = await response.json() as MarketResponse
  writeMarketCache({
    data,
    savedAt: now,
  })

  return data
}

export async function prefetchMarketSignals(): Promise<void> {
  await loadMarketSignals()
}

function writeMarketCache(cache: CachedMarketResponse) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEYS.MARKET, JSON.stringify(cache))
}
