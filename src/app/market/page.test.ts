import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('MarketPage source', () => {
  it('시장 페이지를 KPI 상단과 5가지 신호 상세 구조로 유지한다', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

    expect(source).toContain('진입 매력도')
    expect(source).toContain('시장 건강도')
    expect(source).toContain('5가지 신호 상세')
    expect(source).toContain('buildMarketInsight')
    expect(source).toContain("const INDICATOR_ORDER = ['fearGreed', 'yieldCurve', 'erp', 'creditSpread', 'm2'] as const")
  })
})
