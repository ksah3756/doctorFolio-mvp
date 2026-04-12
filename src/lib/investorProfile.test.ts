// src/lib/investorProfile.test.ts
import { describe, it, expect } from 'vitest'
import { inferStyleKey, PRESETS } from './investorProfile'
import type { PortfolioPosition } from './types'

function pos(assetClass: PortfolioPosition['assetClass'], value: number): PortfolioPosition {
  return {
    id: crypto.randomUUID(),
    name: 'test',
    code: null,
    qty: 1,
    value,
    avgCost: value,
    currentPrice: value,
    assetClass,
    sector: '기타',
    sourceImage: 1,
  }
}

describe('inferStyleKey', () => {
  it('빈 배열 → balanced', () => {
    expect(inferStyleKey([])).toBe('balanced')
  })

  it('전체 value=0 → balanced', () => {
    expect(inferStyleKey([pos('국내주식', 0), pos('채권', 0)])).toBe('balanced')
  })

  it('채권 50% → balanced (임계값 초과 아님)', () => {
    expect(inferStyleKey([pos('채권', 50), pos('국내주식', 50)])).toBe('balanced')
  })

  it('채권 70% → stable', () => {
    expect(inferStyleKey([pos('채권', 70), pos('국내주식', 30)])).toBe('stable')
  })

  it('주식 90%+ → aggressive', () => {
    expect(inferStyleKey([pos('해외주식', 50), pos('국내주식', 45), pos('채권', 5)])).toBe('aggressive')
  })

  it('주식 70% → growth', () => {
    expect(inferStyleKey([pos('국내주식', 40), pos('해외주식', 30), pos('채권', 30)])).toBe('growth')
  })

  it('주식 50%, 채권 30% → balanced', () => {
    expect(inferStyleKey([pos('국내주식', 30), pos('해외주식', 20), pos('채권', 30), pos('기타', 20)])).toBe('balanced')
  })

  it('기타 비중이 높아도 주식/채권 비율로 판단', () => {
    // 주식 40%, 채권 20%, 기타 40% → balanced
    expect(inferStyleKey([pos('국내주식', 40), pos('채권', 20), pos('기타', 40)])).toBe('balanced')
  })
})

describe('PRESETS round-trip', () => {
  it('각 프리셋 target 배분이 자기 자신 StyleKey로 추론된다', () => {
    const keys = ['stable', 'balanced', 'growth', 'aggressive'] as const
    for (const key of keys) {
      const t = PRESETS[key].target
      const positions = [
        pos('국내주식', t['국내주식']),
        pos('해외주식', t['해외주식']),
        pos('채권', t['채권']),
        pos('기타', t['현금']),
      ]
      expect(inferStyleKey(positions), `${key} round-trip`).toBe(key)
    }
  })
})

describe('PRESETS', () => {
  it('4개 프리셋 target 합계 모두 100', () => {
    const keys = ['stable', 'balanced', 'growth', 'aggressive'] as const
    for (const key of keys) {
      const t = PRESETS[key].target
      expect(t['국내주식'] + t['해외주식'] + t['채권'] + t['현금']).toBe(100)
    }
  })

  it('모든 프리셋에 label, emoji, desc, target이 있다', () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.label).toBeTruthy()
      expect(preset.emoji).toBeTruthy()
      expect(preset.desc).toBeTruthy()
      expect(preset.target).toBeTruthy()
    }
  })
})
