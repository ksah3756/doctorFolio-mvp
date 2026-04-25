import { describe, expect, it } from 'vitest'
import { buildMarketInsight, getMarketZone } from './marketInsightTemplates'

describe('marketInsightTemplates', () => {
  it('진입/건강 점수 조합에 따라 존을 분류한다', () => {
    expect(getMarketZone(80, 80)).toBe('ideal_entry')
    expect(getMarketZone(70, 25)).toBe('risk_but_opportunity')
    expect(getMarketZone(20, 20)).toBe('risk_first')
    expect(getMarketZone(20, 80)).toBe('overheated')
    expect(getMarketZone(65, 50)).toBe('cautious_opportunity')
  })

  it('존에 맞는 제목과 메시지를 반환한다', () => {
    const insight = buildMarketInsight(67, 38)

    expect(insight.zone).toBe('risk_but_opportunity')
    expect(insight.title).toBe('위험하지만 기회 있음')
    expect(insight.message).toContain('시장')
  })
})
