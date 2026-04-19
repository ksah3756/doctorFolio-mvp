import { describe, expect, it } from 'vitest'
import {
  buildTradingSignal,
  calculateMacdState,
  calculateRsi,
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

describe('buildTradingSignal', () => {
  it('과매도 + 바닥권 조합이면 매수 추천을 준다', () => {
    const signal = buildTradingSignal({
      companyName: 'Apple',
      currentPrice: 92,
      fearGreed: { label: 'Fear', score: 25 },
      insiderActivity: { buyCount: 2, netValue: 3_000_000, sellCount: 0 },
      market: 'US',
      marketSymbol: 'AAPL',
      priceHistory: Array.from({ length: 260 }, (_, index) => ({
        close: 150 - index * 0.22,
        volume: 100_000 + index * 100,
      })).reverse(),
      ticker: 'AAPL',
      week52High: 180,
      week52Low: 88,
    })

    expect(signal.metrics).toHaveLength(7)
    expect(signal.recommendation).toBe('buy')
    expect(signal.metrics[0].summary).toContain('RSI')
    expect(signal.metrics[6].label).toBe('Fear&Greed')
  })

  it('과열 지표가 많으면 매도 추천을 준다', () => {
    const signal = buildTradingSignal({
      companyName: 'Samsung Electronics',
      currentPrice: 220,
      fearGreed: { label: 'Greed', score: 78 },
      insiderActivity: { buyCount: 0, netValue: -5_000_000, sellCount: 3 },
      market: 'KR',
      marketSymbol: '005930.KS',
      priceHistory: Array.from({ length: 260 }, (_, index) => ({
        close: 100 + index * 0.5,
        volume: 100_000 + index * 50,
      })),
      ticker: '005930',
      week52High: 225,
      week52Low: 95,
    })

    expect(signal.recommendation).toBe('sell')
    expect(signal.metrics.some(metric => metric.signal === 'sell')).toBe(true)
  })
})
