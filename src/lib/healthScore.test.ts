import { describe, expect, it } from 'vitest'
import { computeHealthScore, computeIdealScore } from './healthScore'
import type {
  AllocationBucket,
  AssetClass,
  PortfolioPosition,
  StyleKey,
  TargetAllocation,
} from './types'

const TARGET: TargetAllocation = {
  '국내주식': 35,
  '해외주식': 25,
  '채권': 30,
  '현금': 10,
}

const PERFECT_ALLOCATION: Record<AllocationBucket, number> = {
  '국내주식': 35,
  '해외주식': 25,
  '채권': 30,
  '현금': 10,
  '기타': 0,
}

function createPosition(
  index: number,
  value: number,
  assetClass: AssetClass = '국내주식',
  sector = `섹터-${index}`,
): PortfolioPosition {
  return {
    id: `position-${index}`,
    name: `종목-${index}`,
    code: `TEST${index}`,
    qty: 1,
    value,
    avgCost: value,
    currentPrice: value,
    assetClass,
    sector,
    sourceImage: 1,
  }
}

function createDiversifiedPositions(count: number): PortfolioPosition[] {
  return Array.from({ length: count }, (_, index) => createPosition(index + 1, 100 / count))
}

function computeBoundaryScore(holdingCount: number, desiredStyle: StyleKey = 'balanced'): number {
  return computeHealthScore(
    PERFECT_ALLOCATION,
    TARGET,
    createDiversifiedPositions(holdingCount),
    desiredStyle,
  )
}

describe('computeHealthScore', () => {
  it('Style Fit: tolerance 이내 차이는 감점하지 않는다', () => {
    const withinToleranceAllocation: Record<AllocationBucket, number> = {
      '국내주식': 40,
      '해외주식': 20,
      '채권': 30,
      '현금': 10,
      '기타': 0,
    }

    expect(
      computeHealthScore(
        withinToleranceAllocation,
        TARGET,
        createDiversifiedPositions(10),
        'balanced',
      ),
    ).toBe(100)
  })

  it('Style Fit: maxDistance 초과면 해당 항목 점수는 0점이 된다', () => {
    const farAllocation: Record<AllocationBucket, number> = {
      '국내주식': 70,
      '해외주식': 25,
      '채권': 30,
      '현금': 10,
      '기타': 0,
    }

    expect(
      computeHealthScore(
        farAllocation,
        TARGET,
        createDiversifiedPositions(10),
        'balanced',
      ),
    ).toBe(88)
  })

  it('Diversification: aggressive 보정은 최대 점수에서 clamp된다', () => {
    expect(
      computeHealthScore(
        PERFECT_ALLOCATION,
        TARGET,
        createDiversifiedPositions(10),
        'aggressive',
      ),
    ).toBe(100)
  })

  it('Simplicity: 보유 종목 수 3개 경계값을 반영한다', () => {
    expect(computeBoundaryScore(3)).toBe(80)
  })

  it('Simplicity: 보유 종목 수 6개 경계값을 반영한다', () => {
    expect(computeBoundaryScore(6)).toBe(96)
  })

  it('Simplicity: 보유 종목 수 12개 경계값을 반영한다', () => {
    expect(computeBoundaryScore(12)).toBe(100)
  })

  it('Simplicity: 보유 종목 수 20개 경계값을 반영한다', () => {
    expect(computeBoundaryScore(20)).toBe(97)
  })
})

describe('computeIdealScore', () => {
  it('현재 건강점수보다 낮지 않고 Style Fit 만점을 반영한다', () => {
    const currentAllocation: Record<AllocationBucket, number> = {
      '국내주식': 55,
      '해외주식': 15,
      '채권': 20,
      '현금': 5,
      '기타': 5,
    }
    const positions = [
      createPosition(1, 55, '국내주식', '반도체'),
      createPosition(2, 15, '해외주식', '미국주식'),
      createPosition(3, 20, '채권', '채권 ETF'),
      createPosition(4, 5, '기타', '기타'),
      { ...createPosition(5, 5, '기타', '기타'), name: '현금', code: null, qty: 0, avgCost: 0, currentPrice: 0 },
    ]

    const currentScore = computeHealthScore(currentAllocation, TARGET, positions, 'balanced')
    const idealScore = computeIdealScore(currentAllocation, positions, 'balanced')

    expect(idealScore).toBeGreaterThanOrEqual(currentScore)
    expect(idealScore).toBeLessThanOrEqual(100)
    expect(idealScore - currentScore).toBeGreaterThan(0)
  })
})
