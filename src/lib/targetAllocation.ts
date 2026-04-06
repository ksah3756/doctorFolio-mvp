import type { TargetAllocation } from './types'

export function getTargetAllocationSum(target: TargetAllocation): number {
  return target['국내주식'] + target['해외주식'] + target['채권']
}

export function getTargetAllocationErrorMessage(target: TargetAllocation): string | null {
  const total = getTargetAllocationSum(target)

  if (total === 100) {
    return null
  }

  return `합계: ${total}% (100%여야 합니다)`
}
