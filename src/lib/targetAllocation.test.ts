import { describe, expect, it } from 'vitest'
import { getTargetAllocationErrorMessage, getTargetAllocationSum } from './targetAllocation'

describe('getTargetAllocationSum', () => {
  it('adds all target allocation buckets', () => {
    expect(getTargetAllocationSum({ '국내주식': 50, '해외주식': 25, '채권': 15 })).toBe(90)
  })
})

describe('getTargetAllocationErrorMessage', () => {
  it('returns null when the target sums to 100', () => {
    expect(getTargetAllocationErrorMessage({ '국내주식': 40, '해외주식': 30, '채권': 30 })).toBeNull()
  })

  it('returns the inline validation copy when the target sum is invalid', () => {
    expect(getTargetAllocationErrorMessage({ '국내주식': 45, '해외주식': 30, '채권': 20 })).toBe('합계: 95% (100%여야 합니다)')
  })
})
