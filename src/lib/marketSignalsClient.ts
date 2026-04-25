'use client'

import { SESSION_KEYS } from './types'
import { type MarketResponse } from './marketSignals'

const MARKET_CACHE_SECONDS = 86_400
const EXPECTED_MARKET_KEYS = ['fearGreed', 'yieldCurve', 'erp', 'creditSpread', 'm2'] as const

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

  if (!forceRefresh && cached && isFreshMarketCache(cached, now)) {
    return cached.data
  }

  if (!forceRefresh && cached && typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEYS.MARKET)
  }

  const response = await fetch('/api/market')
  if (!response.ok) {
    throw new Error('market fetch failed')
  }

  const data = await response.json() as MarketResponse
  if (!isMarketResponseShape(data)) {
    throw new Error('market response shape invalid')
  }

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

function isFreshMarketCache(cache: CachedMarketResponse, now: number): boolean {
  return (now - cache.savedAt) < MARKET_CACHE_SECONDS * 1000 && isMarketResponseShape(cache.data)
}

function isMarketResponseShape(value: MarketResponse): boolean {
  if (!value || !Array.isArray(value.indicators) || value.indicators.length !== EXPECTED_MARKET_KEYS.length) {
    return false
  }

  const keys = value.indicators.map(indicator => indicator.key).sort()
  const expectedKeys = [...EXPECTED_MARKET_KEYS].sort()
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return false
  }

  return value.indicators.every(indicator => (
    typeof indicator.detailSource === 'string'
    && typeof indicator.detailTitle === 'string'
    && typeof indicator.detailValue === 'string'
    && typeof indicator.guide === 'string'
    && typeof indicator.summary === 'string'
    && typeof indicator.label === 'string'
    && typeof indicator.value === 'string'
  ))
}
