import { describe, expect, it } from 'vitest'
import {
  buildMarketResponse,
  calculateEntryAttractiveness,
  calculateMarketHealth,
  extractSp500PeRatio,
  formatMacroStateLabel,
} from './marketSignals'

describe('buildMarketResponse', () => {
  it('가용 지표가 모두 우호적이면 Risk-On으로 판정한다', () => {
    const response = buildMarketResponse({
      equityRiskPremium: 2.9,
      fearGreed: { label: 'Greed', score: 68 },
      fetchedAt: '2026-04-19T00:00:00.000Z',
      highYieldSpread: 3.2,
      m2YearOverYear: 3.1,
      treasury10YearRate: 4.3,
      treasury2YearRate: 3.4,
    })

    expect(response.macroState).toBe('risk_on')
    expect(response.macroScore).toBe(1)
    expect(response.indicators.every(indicator => indicator.status === 'positive')).toBe(true)
  })

  it('모든 외부 지표를 못 받으면 중립으로 fallback 한다', () => {
    const response = buildMarketResponse({
      equityRiskPremium: null,
      fearGreed: null,
      highYieldSpread: null,
      m2YearOverYear: null,
      treasury10YearRate: null,
      treasury2YearRate: null,
    })

    expect(response.macroState).toBe('neutral')
    expect(response.headline).toContain('기본값인 중립')
    expect(response.indicators.every(indicator => indicator.status === 'unavailable')).toBe(true)
  })

  it('불안 지표가 많으면 Risk-Off로 판정한다', () => {
    const response = buildMarketResponse({
      equityRiskPremium: -0.7,
      fearGreed: { label: 'Fear', score: 22 },
      highYieldSpread: 6.4,
      m2YearOverYear: -1.2,
      treasury10YearRate: 4.6,
      treasury2YearRate: 4.8,
    })

    expect(response.macroState).toBe('risk_off')
    expect(response.macroScore).toBe(-1)
    expect(response.overview.entry.label).toBe('신중한 관망')
    expect(response.overview.health.label).toBe('불안')
  })

  it('프롬프트 기준 점수 체계로 진입 매력도와 시장 건강도를 계산한다', () => {
    const response = buildMarketResponse({
      equityRiskPremium: 3.2,
      fearGreed: { label: 'Fear', score: 23 },
      fetchedAt: '2026-04-19T00:00:00.000Z',
      highYieldSpread: 4.2,
      m2YearOverYear: 4.5,
      treasury10YearRate: 4.1,
      treasury2YearRate: 4.6,
    })

    expect(response.overview.entry.score).toBe(62)
    expect(response.overview.entry.label).toBe('진입 검토 가능')
    expect(response.overview.health.score).toBe(51)
    expect(response.overview.health.label).toBe('중립')
  })
})

describe('market signal helpers', () => {
  it('macro 상태 라벨을 한글 UI 용도로 변환한다', () => {
    expect(formatMacroStateLabel('risk_on')).toBe('Risk-On')
    expect(formatMacroStateLabel('neutral')).toBe('중립')
    expect(formatMacroStateLabel('risk_off')).toBe('Risk-Off')
  })

  it('멀티플 HTML에서 S&P 500 PE 값을 파싱한다', () => {
    expect(extractSp500PeRatio('<div>Current S&P 500 PE Ratio is 30.62</div>')).toBe(30.62)
    expect(extractSp500PeRatio('<html>missing</html>')).toBeNull()
  })

  it('진입 매력도는 공포 기회와 패널티를 함께 반영한다', () => {
    const score = calculateEntryAttractiveness({
      equityRiskPremium: 3.5,
      fearGreed: 20,
      highYieldSpread: 4.1,
      m2GrowthYoY: 5,
      yieldSpread: -0.5,
    })

    expect(score).toBe(62)
  })

  it('시장 건강도는 가중 평균으로 계산한다', () => {
    const score = calculateMarketHealth({
      equityRiskPremium: 3.5,
      fearGreed: 20,
      highYieldSpread: 4.1,
      m2GrowthYoY: 5,
      yieldSpread: -0.5,
    })

    expect(score).toBe(51)
  })
})
