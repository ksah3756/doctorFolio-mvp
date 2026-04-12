import { describe, expect, it } from 'vitest'
import { getTargetAllocationErrorMessage, getTargetAllocationSum } from './targetAllocation'

describe('getTargetAllocationSum', () => {
  it('adds all target allocation buckets', () => {
    expect(getTargetAllocationSum({ '국내주식': 50, '해외주식': 25, '채권': 15, '현금': 10 })).toBe(100)
  })
})

describe('getTargetAllocationErrorMessage', () => {
  it('returns null when the target sums to 100', () => {
    expect(getTargetAllocationErrorMessage({ '국내주식': 35, '해외주식': 25, '채권': 30, '현금': 10 })).toBeNull()
  })

  it('returns the inline validation copy when the target sum is invalid', () => {
    expect(getTargetAllocationErrorMessage({ '국내주식': 45, '해외주식': 30, '채권': 20, '현금': 15 })).toBe('합계: 110% (100%여야 합니다)')
  })
})
