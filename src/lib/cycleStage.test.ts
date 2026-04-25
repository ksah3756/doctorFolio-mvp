import { describe, expect, it } from 'vitest'
import { deriveCycleStage } from './cycleStage'
import type { MarketResponse } from './marketSignals'

function createMarketResponse(healthScore: number): MarketResponse {
  return {
    fetchedAt: '2026-04-25T00:00:00.000Z',
    headline: 'test',
    indicators: [],
    macroScore: 0,
    macroState: 'neutral',
    overview: {
      entry: {
        guide: '분할로 접근할 수 있어요.',
        label: '중립',
        score: 50,
        summary: 'entry summary',
      },
      health: {
        guide: 'health guide',
        label: '중립',
        score: healthScore,
        summary: 'health summary',
      },
    },
  }
}

describe('deriveCycleStage', () => {
  it('health score가 높으면 확장 국면으로 분류한다', () => {
    const stage = deriveCycleStage(createMarketResponse(78))

    expect(stage.label).toBe('확장')
    expect(stage.accentClassName).toBe('accentNavy')
    expect(stage.summary).toBe('분할로 접근할 수 있어요.')
  })

  it('health score가 낮으면 침체 국면으로 분류한다', () => {
    const stage = deriveCycleStage(createMarketResponse(24))

    expect(stage.label).toBe('침체')
    expect(stage.accentClassName).toBe('accentRed')
  })
})
