'use client'

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseOcrErrorResponse } from './ocr'
import { loadMarketSignals } from './marketSignalsClient'
import { listSignalTargets, loadTradingSignals } from './tradingSignalsClient'
import type { MarketResponse } from './marketSignals'
import type { TradingSignal } from './tradingSignals'
import type { DiagnosisResult, PortfolioPosition } from './types'

const MARKET_STALE_MS = 86_400_000

export const portfolioQueryKeys = {
  market: ['market-signals'] as const,
  tradingSignals: (positions: PortfolioPosition[]) => [
    'trading-signals',
    listSignalTargets(positions).map(target => `${target.market}:${target.ticker}`).sort(),
  ] as const,
}

export function useMarketSignals() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: portfolioQueryKeys.market,
    queryFn: () => loadMarketSignals(),
    staleTime: MARKET_STALE_MS,
  })

  async function refresh(): Promise<MarketResponse> {
    const data = await loadMarketSignals(true)
    queryClient.setQueryData(portfolioQueryKeys.market, data)
    return data
  }

  return { ...query, refresh }
}

export function useTradingSignals(positions: PortfolioPosition[]) {
  const queryClient = useQueryClient()
  const queryKey = portfolioQueryKeys.tradingSignals(positions)
  const query = useQuery({
    queryKey,
    queryFn: () => loadTradingSignals(positions),
    enabled: positions.length > 0,
    staleTime: MARKET_STALE_MS,
  })

  async function refresh(): Promise<TradingSignal[]> {
    const data = await loadTradingSignals(positions, true)
    queryClient.setQueryData(queryKey, data)
    return data
  }

  return { ...query, refresh }
}

export async function warmMarketSignalsCache(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: portfolioQueryKeys.market,
    queryFn: () => loadMarketSignals(),
    staleTime: MARKET_STALE_MS,
  })
}

export async function warmTradingSignalsCache(
  queryClient: QueryClient,
  positions: PortfolioPosition[],
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: portfolioQueryKeys.tradingSignals(positions),
    queryFn: () => loadTradingSignals(positions),
    staleTime: MARKET_STALE_MS,
  })
}

export function useExplainDiagnosis() {
  return useMutation({
    mutationFn: async (diagnosis: DiagnosisResult): Promise<string> => {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnosis),
      })
      if (!response.ok) throw new Error('explain fetch failed')

      const data = await response.json() as { explanation?: unknown }
      if (typeof data.explanation !== 'string') {
        throw new Error('explain response shape invalid')
      }

      return data.explanation
    },
  })
}

export function useOcrPositions() {
  return useMutation({
    mutationFn: async (formData: FormData): Promise<PortfolioPosition[]> => {
      const response = await fetch('/api/ocr', { method: 'POST', body: formData })
      if (!response.ok) {
        throw new Error(parseOcrErrorResponse(await response.text()))
      }

      return await response.json() as PortfolioPosition[]
    },
  })
}
