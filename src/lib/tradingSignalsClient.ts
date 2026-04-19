'use client'

import { SESSION_KEYS, type PortfolioPosition } from './types'
import {
  SIGNAL_CACHE_SECONDS,
  resolveTradingSignalTarget,
  type TradingSignal,
  type TradingSignalTarget,
} from './tradingSignals'

interface CachedTradingSignal {
  data: TradingSignal
  savedAt: number
}

type TradingSignalCache = Record<string, CachedTradingSignal>

export function listSignalTargets(positions: PortfolioPosition[]): TradingSignalTarget[] {
  return positions.flatMap(position => {
    const target = resolveTradingSignalTarget(position)
    return target ? [target] : []
  })
}

export function readSignalCache(): TradingSignalCache {
  if (typeof window === 'undefined') return {}

  const raw = sessionStorage.getItem(SESSION_KEYS.SIGNALS)
  if (!raw) return {}

  try {
    return JSON.parse(raw) as TradingSignalCache
  } catch {
    return {}
  }
}

export async function loadTradingSignals(positions: PortfolioPosition[]): Promise<TradingSignal[]> {
  const targets = listSignalTargets(positions)
  const cache = readSignalCache()
  const now = Date.now()
  const freshSignals = new Map<string, TradingSignal>()
  const missingTargets: TradingSignalTarget[] = []

  for (const target of targets) {
    const key = getTradingSignalCacheKey(target)
    const cached = cache[key]

    if (cached && (now - cached.savedAt) < SIGNAL_CACHE_SECONDS * 1000) {
      freshSignals.set(key, cached.data)
      continue
    }

    missingTargets.push(target)
  }

  if (missingTargets.length > 0) {
    const fetchedSignals = await Promise.all(missingTargets.map(fetchTradingSignalFromApi))
    const nextCache = { ...cache }

    for (const signal of fetchedSignals) {
      const key = getTradingSignalCacheKey(signal)
      nextCache[key] = {
        data: signal,
        savedAt: now,
      }
      freshSignals.set(key, signal)
    }

    writeSignalCache(nextCache)
  }

  return targets
    .map(target => freshSignals.get(getTradingSignalCacheKey(target)))
    .filter((signal): signal is TradingSignal => signal !== undefined)
}

export async function prefetchTradingSignals(positions: PortfolioPosition[]): Promise<void> {
  await loadTradingSignals(positions)
}

function getTradingSignalCacheKey(target: Pick<TradingSignalTarget, 'market' | 'ticker'>): string {
  return `${target.market}:${target.ticker}`
}

async function fetchTradingSignalFromApi(target: TradingSignalTarget): Promise<TradingSignal> {
  const params = new URLSearchParams({ market: target.market, ticker: target.ticker })
  const response = await fetch(`/api/signals?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`signal fetch failed for ${target.market}:${target.ticker}`)
  }

  return await response.json() as TradingSignal
}

function writeSignalCache(cache: TradingSignalCache) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEYS.SIGNALS, JSON.stringify(cache))
}
