import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('MarketPage source', () => {
  it('시장 페이지를 경기 사이클 카드와 5가지 신호 상세 구조로 유지한다', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

    expect(source).toContain("const CYCLE_STAGES = ['회복', '확장', '둔화', '침체'] as const")
    expect(source).toContain('경기 사이클 위치')
    expect(source).toContain('5가지 신호 상세')
    expect(source).toContain("const INDICATOR_ORDER = ['fearGreed', 'yieldCurve', 'erp', 'creditSpread', 'm2'] as const")
  })
})
