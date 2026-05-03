/**
 * @vitest-environment jsdom
 */
import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useExplainDiagnosis,
  useMarketSignals,
  useOcrPositions,
  useTradingSignals,
} from './portfolioQueries'
import type { MarketResponse } from './marketSignals'
import type { TradingSignal } from './tradingSignals'
import type { DiagnosisResult, PortfolioPosition } from './types'

const marketResponse: MarketResponse = {
  fetchedAt: '2026-01-01T00:00:00.000Z',
  headline: 'market headline',
  indicators: [
    marketIndicator('fearGreed'),
    marketIndicator('yieldCurve'),
    marketIndicator('erp'),
    marketIndicator('creditSpread'),
    marketIndicator('m2'),
  ],
  macroScore: 0.4,
  macroState: 'risk_on',
  overview: {
    entry: { guide: 'guide', label: 'good', score: 70, summary: 'entry summary' },
    health: { guide: 'guide', label: 'healthy', score: 80, summary: 'health summary' },
  },
}

const position: PortfolioPosition = {
  id: 'p1',
  name: 'Apple',
  code: 'aapl',
  qty: 1,
  value: 100,
  avgCost: 90,
  currentPrice: 100,
  assetClass: '해외주식',
  sector: '기술',
  sourceImage: 1,
}

const signal: TradingSignal = {
  companyName: 'Apple',
  confidence: 'medium',
  confidenceSummary: 'enough data',
  currentPrice: 100,
  expertDetails: [],
  fetchedAt: '2026-01-01T00:00:00.000Z',
  label: '관심 종목',
  market: 'US',
  marketSymbol: 'AAPL',
  metrics: [],
  normalizedScore: 60,
  recommendation: 'neutral',
  referenceMetrics: [],
  score: 60,
  summary: 'signal summary',
  ticker: 'AAPL',
  week52High: 120,
  week52Low: 80,
}

const diagnosis: DiagnosisResult = {
  actions: [],
  currentAllocation: { 국내주식: 0, 해외주식: 100, 채권: 0, 기타: 0, 현금: 0 },
  problems: [],
  targetAllocation: { 국내주식: 35, 해외주식: 25, 채권: 30, 현금: 10 },
  totalValue: 100,
}

function marketIndicator(key: MarketResponse['indicators'][number]['key']): MarketResponse['indicators'][number] {
  return {
    detailSource: 'source',
    detailTitle: `${key} detail`,
    detailValue: 'value',
    guide: 'guide',
    key,
    label: key,
    status: 'positive',
    summary: 'summary',
    value: 'value',
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('portfolio query hooks', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads market server state through TanStack Query and refreshes without syncing to Zustand', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(marketResponse))
      .mockResolvedValueOnce(jsonResponse({ ...marketResponse, headline: 'fresh market' }))

    const { result } = renderHook(() => useMarketSignals(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.data?.headline).toBe('market headline'))
    expect(fetchMock).toHaveBeenCalledWith('/api/market')

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(result.current.data?.headline).toBe('fresh market'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('loads trading signals with a stable target-based query key', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(signal))

    const { result } = renderHook(() => useTradingSignals([position]), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.data).toEqual([signal]))
    expect(fetchMock).toHaveBeenCalledWith('/api/signals?market=US&ticker=AAPL')
  })

  it('posts diagnosis explanations through a mutation hook', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse({ explanation: 'explain text' }))
    const { result } = renderHook(() => useExplainDiagnosis(), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync(diagnosis)).resolves.toBe('explain text')
    expect(fetchMock).toHaveBeenCalledWith('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagnosis),
    })
  })

  it('posts OCR form data through a mutation hook', async () => {
    const positions = [position]
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(positions))
    const { result } = renderHook(() => useOcrPositions(), { wrapper: createWrapper() })
    const formData = new FormData()

    formData.append('images', new Blob(['image']), 'capture.png')

    await expect(result.current.mutateAsync(formData)).resolves.toEqual(positions)
    expect(fetchMock).toHaveBeenCalledWith('/api/ocr', { method: 'POST', body: formData })
  })
})

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}
