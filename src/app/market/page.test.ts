import { describe, expect, it } from 'vitest'
import { deriveCycleStage } from '@/lib/cycleStage'
import type { MarketResponse } from '@/lib/marketSignals'

function createMarketResponse(healthScore: number): MarketResponse {
  return {
    fetchedAt: '2026-04-25T00:00:00.000Z',
    headline: 'test',
    indicators: [],
    macroScore: 0,
    macroState: 'neutral',
    overview: {
      entry: {
        guide: '분할 접근을 검토해도 되는 구간이에요.',
        label: '진입 검토 가능',
        score: 62,
        summary: '시장 불안 요소가 일부 있지만, 진입 기회를 살펴볼 수 있는 구간이에요.',
      },
      health: {
        guide: '좋은 신호와 나쁜 신호가 섞여 있어 한쪽으로 단정하기 어려워요.',
        label: '중립',
        score: healthScore,
        summary: '시장 방향성이 뚜렷하지 않은 구간이에요.',
      },
    },
  }
}

describe('Market cycle stage', () => {
  it('시장 페이지에서 쓰는 경기 사이클 분류를 lib helper로 계산한다', () => {
    const stage = deriveCycleStage(createMarketResponse(52))

    expect(stage.label).toBe('둔화')
    expect(stage.caption).toBe('둔화 초입 국면')
    expect(stage.summary).toContain('분할 접근')
  })
})
