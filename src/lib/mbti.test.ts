// src/lib/mbti.test.ts
import { describe, it, expect } from 'vitest'
import { inferMbtiAxes, inferMbtiType, MBTI_PROFILES } from './mbti'
import type { PortfolioPosition } from './types'

function pos(overrides: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'test',
    name: '테스트종목',
    code: null,
    qty: 10,
    value: 1_000_000,
    avgCost: 100_000,
    currentPrice: 100_000,
    assetClass: '국내주식',
    sector: '금융',
    sourceImage: 1,
    ...overrides,
  }
}

describe('inferMbtiAxes', () => {
  it('빈 배열 → INFP (기본값)', () => {
    expect(inferMbtiAxes([])).toEqual({ EI: 'I', NS: 'N', TF: 'F', JP: 'P' })
  })

  describe('E/I — 해외주식 비중', () => {
    it('해외주식 30% 이상 → E', () => {
      const positions = [
        pos({ assetClass: '해외주식', value: 300_000 }),
        pos({ assetClass: '국내주식', value: 700_000 }),
      ]
      expect(inferMbtiAxes(positions).EI).toBe('E')
    })

    it('해외주식 30% 미만 → I', () => {
      const positions = [
        pos({ assetClass: '해외주식', value: 290_000 }),
        pos({ assetClass: '국내주식', value: 710_000 }),
      ]
      expect(inferMbtiAxes(positions).EI).toBe('I')
    })
  })

  describe('N/S — 성장형 섹터 비중', () => {
    it('주식 종목 중 성장 섹터 40% 이상 → N', () => {
      const positions = [
        pos({ sector: '반도체', value: 400_000 }),
        pos({ sector: '바이오', value: 100_000 }),
        pos({ sector: '금융', value: 500_000 }),
      ]
      // 반도체+바이오 = 2/3 종목 = 66% → N
      expect(inferMbtiAxes(positions).NS).toBe('N')
    })

    it('성장 섹터 40% 미만 → S', () => {
      const positions = [
        pos({ sector: '반도체', value: 100_000 }),
        pos({ sector: '금융', value: 300_000 }),
        pos({ sector: '보험', value: 300_000 }),
        pos({ sector: '유틸리티', value: 300_000 }),
      ]
      // 반도체 1/4 = 25% → S
      expect(inferMbtiAxes(positions).NS).toBe('S')
    })
  })

  describe('T/F — 주식 비중', () => {
    it('주식 60% 이상 → T', () => {
      const positions = [
        pos({ assetClass: '국내주식', value: 600_000 }),
        pos({ assetClass: '채권', value: 400_000 }),
      ]
      expect(inferMbtiAxes(positions).TF).toBe('T')
    })

    it('주식 60% 미만 → F', () => {
      const positions = [
        pos({ assetClass: '국내주식', value: 590_000 }),
        pos({ assetClass: '채권', value: 410_000 }),
      ]
      expect(inferMbtiAxes(positions).TF).toBe('F')
    })
  })

  describe('J/P — 종목 수', () => {
    it('7개 이하 → J', () => {
      const positions = Array.from({ length: 7 }, (_, i) =>
        pos({ id: String(i) }),
      )
      expect(inferMbtiAxes(positions).JP).toBe('J')
    })

    it('8개 이상 → P', () => {
      const positions = Array.from({ length: 8 }, (_, i) =>
        pos({ id: String(i) }),
      )
      expect(inferMbtiAxes(positions).JP).toBe('P')
    })
  })
})

describe('inferMbtiType', () => {
  it('빈 배열 → INFP', () => {
    expect(inferMbtiType([])).toBe('INFP')
  })

  it('Analyst 대표: 해외 성장주 집중 → ENTJ', () => {
    // E: 해외 40%, N: 반도체 100%, T: 주식 100%, J: 2종목
    const positions = [
      pos({ assetClass: '해외주식', sector: '반도체', value: 400_000 }),
      pos({ assetClass: '국내주식', sector: '반도체', value: 600_000 }),
    ]
    expect(inferMbtiType(positions)).toBe('ENTJ')
  })

  it('Sentinel 대표: 채권 중심 국내 분산 → ISFJ', () => {
    // I: 해외 0%, S: 금융 등 방어주, F: 주식 40%, J: 4종목
    const positions = [
      pos({ id: '1', assetClass: '국내주식', sector: '금융', value: 100_000 }),
      pos({ id: '2', assetClass: '국내주식', sector: '보험', value: 100_000 }),
      pos({ id: '3', assetClass: '국내주식', sector: '유틸리티', value: 100_000 }),
      pos({ id: '4', assetClass: '국내주식', sector: '통신', value: 100_000 }),
      pos({ id: '5', assetClass: '채권', sector: '채권 ETF', value: 600_000 }),
    ]
    // I: 해외 0%, S: 금융/보험/유틸리티/통신 → 0% 성장, F: 주식 40%, J: 5종목
    expect(inferMbtiType(positions)).toBe('ISFJ')
  })

  it('Explorer 대표: 국내 가치주 분산 → ISTP', () => {
    // I: 해외 0%, S: 가치주 섹터, T: 주식 100%, P: 8종목
    const positions = Array.from({ length: 8 }, (_, i) =>
      pos({ id: String(i), assetClass: '국내주식', sector: '금융', value: 100_000 }),
    )
    expect(inferMbtiType(positions)).toBe('ISTP')
  })
})

describe('MBTI_PROFILES 완결성', () => {
  const ALL_TYPES = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP',
  ] as const

  it('16개 타입 모두 존재', () => {
    expect(Object.keys(MBTI_PROFILES)).toHaveLength(16)
    ALL_TYPES.forEach(t => {
      expect(MBTI_PROFILES).toHaveProperty(t)
    })
  })

  it('모든 프로필에 필수 필드 존재', () => {
    ALL_TYPES.forEach(t => {
      const p = MBTI_PROFILES[t]
      expect(p.name).toBeTruthy()
      expect(p.emoji).toBeTruthy()
      expect(p.investorTagline).toBeTruthy()
    })
  })
})
