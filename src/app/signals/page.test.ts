import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('SignalsPage source', () => {
  it('시장 배너와 시장 데이터 의존성 없이 종목 점수 화면으로 유지된다', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain('MarketBanner')
    expect(source).not.toContain('loadMarketSignals')
    expect(source).not.toContain('resolveFinalJudgment')
    expect(source).toContain('RSI · MACD · 거래량 · 52주 위치, 4가지 지표로 종목 점수를 산출합니다.')
  })
})
