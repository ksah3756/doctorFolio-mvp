import { describe, expect, it } from 'vitest'
import {
  analyzeTradingSignalIndicators,
  buildTradingSignal,
  calculateConfidence,
  calculateMacdState,
  calculateRsi,
  evaluateMacd,
  evaluateRsi,
  evaluateVolume,
  evaluateWeek52Position,
  parseOpenInsiderActivity,
  resolveTradingSignalTarget,
} from './tradingSignals'
import type { PortfolioPosition } from './types'

function makePosition(overrides: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'position-1',
    name: '테스트 종목',
    code: 'AAPL',
    qty: 3,
    value: 300_000,
    avgCost: 100_000,
    currentPrice: 100_000,
    assetClass: '해외주식',
    sector: '하드웨어',
    sourceImage: 1,
    ...overrides,
  }
}

describe('resolveTradingSignalTarget', () => {
  it('해외주식은 US 티커로 변환한다', () => {
    expect(resolveTradingSignalTarget(makePosition({ code: 'msft' }))).toEqual({
      market: 'US',
      name: '테스트 종목',
      ticker: 'MSFT',
    })
  })

  it('국내주식은 KR 티커로 변환한다', () => {
    expect(resolveTradingSignalTarget(makePosition({
      assetClass: '국내주식',
      code: '005930',
      name: '삼성전자',
    }))).toEqual({
      market: 'KR',
      name: '삼성전자',
      ticker: '005930',
    })
  })

  it('코드가 없거나 주식이 아니면 null을 반환한다', () => {
    expect(resolveTradingSignalTarget(makePosition({ code: null }))).toBeNull()
    expect(resolveTradingSignalTarget(makePosition({ assetClass: '채권', code: 'IEF' }))).toBeNull()
  })
})

describe('calculateRsi', () => {
  it('상승 추세는 높은 RSI를 반환한다', () => {
    const closes = Array.from({ length: 20 }, (_, index) => 100 + index * 2)
    expect(calculateRsi(closes)).toBeGreaterThan(70)
  })

  it('하락 추세는 낮은 RSI를 반환한다', () => {
    const closes = Array.from({ length: 20 }, (_, index) => 100 - index * 2)
    expect(calculateRsi(closes)).toBeLessThan(30)
  })
})

describe('calculateMacdState', () => {
  it('상승 추세면 MACD histogram이 양수다', () => {
    const closes = Array.from({ length: 60 }, (_, index) => 100 + index * 1.5)
    expect(calculateMacdState(closes).histogram).toBeGreaterThan(0)
  })

  it('하락 추세면 MACD histogram이 음수다', () => {
    const closes = Array.from({ length: 60 }, (_, index) => 200 - index * 1.5)
    expect(calculateMacdState(closes).histogram).toBeLessThan(0)
  })
})

describe('parseOpenInsiderActivity', () => {
  it('최근 매수/매도 건수와 순매매 금액을 요약한다', () => {
    const html = `
      <tr style="background:#efffef"><td>P</td><td align=right><div>2026-04-10</div></td><td><b>AAPL</b></td><td>CEO</td><td>P - Purchase</td><td align=right>$182.10</td><td align=right>1,000</td><td align=right>20,000</td><td align=right>5%</td><td align=right>$182,100</td></tr>
      <tr style="background:#ffefef"><td>S</td><td align=right><div>2026-04-11</div></td><td><b>AAPL</b></td><td>CFO</td><td>S - Sale</td><td align=right>$183.00</td><td align=right>-500</td><td align=right>10,000</td><td align=right>-2%</td><td align=right>-$91,500</td></tr>
    `

    expect(parseOpenInsiderActivity(html)).toEqual({
      buyCount: 1,
      netValue: 90_600,
      sellCount: 1,
    })
  })
})

describe('metric evaluation', () => {
  it('RSI 경계값을 새 설계대로 해석한다', () => {
    expect(evaluateRsi(29).signal).toBe('buy')
    expect(evaluateRsi(29).strength).toBe(0.85)
    expect(evaluateRsi(42.3).strength).toBe(0.35)
    expect(evaluateRsi(58).signal).toBe('neutral')
    expect(evaluateRsi(74).signal).toBe('sell')
    expect(evaluateRsi(84).strength).toBe(0.85)
  })

  it('MACD phase를 상승/반등/약세로 나눈다', () => {
    expect(evaluateMacd({
      histogram: 0.82,
      macd: 1.2,
      previousHistogram: 0.4,
      signal: 0.38,
    }).status).toBe('상승 흐름')

    expect(evaluateMacd({
      histogram: 0.32,
      macd: 0.9,
      previousHistogram: 0.5,
      signal: 0.58,
    }).status).toBe('상승 둔화')

    expect(evaluateMacd({
      histogram: -0.18,
      macd: -0.8,
      previousHistogram: -0.45,
      signal: -0.62,
    }).status).toBe('반등 조짐')

    expect(evaluateMacd({
      histogram: -0.72,
      macd: -1.4,
      previousHistogram: -0.5,
      signal: -0.68,
    }).signal).toBe('sell')
  })

  it('거래량은 최근 3일 수익률과 결합해 신호를 낸다', () => {
    expect(evaluateVolume(1.1, 2.1).signal).toBe('neutral')
    expect(evaluateVolume(1.8, 2.1).signal).toBe('buy')
    expect(evaluateVolume(1.8, -2.1).signal).toBe('sell')
  })

  it('52주 위치는 설계안의 구간대로 점수를 준다', () => {
    expect(evaluateWeek52Position(0.2).status).toBe('저점권 근접')
    expect(evaluateWeek52Position(0.35).signal).toBe('buy')
    expect(evaluateWeek52Position(0.6).signal).toBe('neutral')
    expect(evaluateWeek52Position(0.82).status).toBe('고점권 경계')
    expect(evaluateWeek52Position(0.93).signal).toBe('sell')
  })
})

describe('calculateConfidence', () => {
  it('핵심 지표 정렬도가 높고 점수 폭이 크면 high를 준다', () => {
    expect(calculateConfidence([
      { key: 'rsi', signal: 'buy' },
      { key: 'macd', signal: 'buy' },
      { key: 'volume', signal: 'buy' },
      { key: 'fiftyTwoWeek', signal: 'buy' },
    ], 0.52)).toBe('high')
  })

  it('방향은 맞지만 점수 폭이 약하면 medium을 준다', () => {
    expect(calculateConfidence([
      { key: 'rsi', signal: 'buy' },
      { key: 'macd', signal: 'buy' },
      { key: 'volume', signal: 'neutral' },
      { key: 'fiftyTwoWeek', signal: 'neutral' },
    ], 0.3)).toBe('medium')
  })

  it('지표가 엇갈리면 low를 준다', () => {
    expect(calculateConfidence([
      { key: 'rsi', signal: 'buy' },
      { key: 'macd', signal: 'sell' },
      { key: 'volume', signal: 'neutral' },
      { key: 'fiftyTwoWeek', signal: 'buy' },
    ], 0.18)).toBe('low')
  })
})

describe('analyzeTradingSignalIndicators', () => {
  it('설계안 예시 입력을 76점 / 분할매수 고려 / high로 변환한다', () => {
    const analysis = analyzeTradingSignalIndicators({
      diffFromAverage6Month: -4.2,
      insiderActivity: { buyCount: 0, netValue: 0, sellCount: 0 },
      macdState: {
        histogram: 0.82,
        macd: 1.1,
        previousHistogram: 0.38,
        signal: 0.28,
      },
      market: 'US',
      recentReturn3d: 2.1,
      rsi: 42.3,
      volumeRatio: 1.8,
      week52Band: 0.35,
    })

    expect(analysis.score).toBe(76)
    expect(analysis.label).toBe('분할매수 고려')
    expect(analysis.confidence).toBe('high')
    expect(analysis.metrics.map(metric => metric.contribution.toFixed(2))).toEqual([
      '0.42',
      '1.20',
      '0.60',
      '0.32',
    ])
    expect(analysis.summary).toContain('가격도 합리적인 편이고')
    expect(analysis.summary).toContain('상승 신호가 나오고 있어요.')
  })
})

describe('buildTradingSignal', () => {
  it('핵심 지표와 참고 지표를 분리해 반환한다', () => {
    const signal = buildTradingSignal({
      companyName: 'Apple',
      currentPrice: 92,
      insiderActivity: { buyCount: 2, netValue: 3_000_000, sellCount: 0 },
      market: 'US',
      marketSymbol: 'AAPL',
      priceHistory: Array.from({ length: 260 }, (_, index) => ({
        close: 150 - index * 0.22,
        volume: 100_000 + index * 150,
      })).reverse(),
      ticker: 'AAPL',
      week52High: 180,
      week52Low: 88,
    })

    expect(signal.metrics).toHaveLength(4)
    expect(signal.referenceMetrics).toHaveLength(2)
    expect(signal.expertDetails).toHaveLength(6)
    expect(signal.currentPrice).toBe(92)
    expect(signal.label).toMatch(/분할매수 고려|관심 종목|관망 우세|주의 필요|리스크 높음/)
    expect(signal.summary.length).toBeGreaterThan(0)
    expect(signal.week52High).toBe(180)
    expect(signal.week52Low).toBe(88)
  })
})
