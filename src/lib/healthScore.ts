import type {
  AllocationBucket,
  PortfolioPosition,
  StyleKey,
  TargetAllocation,
} from './types'

type StyleFitRule = {
  maxScore: number
  maxDistance: number
  tolerance: number
  target: (targetAllocation: TargetAllocation) => number
}

const STYLE_FIT_RULES: Record<AllocationBucket, StyleFitRule> = {
  '국내주식': {
    maxScore: 12.5,
    maxDistance: 30,
    tolerance: 5,
    target: targetAllocation => targetAllocation['국내주식'],
  },
  '해외주식': {
    maxScore: 12.5,
    maxDistance: 30,
    tolerance: 5,
    target: targetAllocation => targetAllocation['해외주식'],
  },
  '채권': {
    maxScore: 18,
    maxDistance: 20,
    tolerance: 5,
    target: targetAllocation => targetAllocation['채권'],
  },
  '현금': {
    maxScore: 12,
    maxDistance: 20,
    tolerance: 3,
    target: targetAllocation => targetAllocation['현금'],
  },
  '기타': {
    maxScore: 5,
    maxDistance: 20,
    tolerance: 3,
    target: () => 0,
  },
}

const MAX_STYLE_FIT_SCORE = 60

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isCashPosition(position: PortfolioPosition): boolean {
  return position.assetClass === '기타' && position.name === '현금'
}

function getStyleFitScore(
  currentAllocation: Record<AllocationBucket, number>,
  targetAllocation: TargetAllocation,
): number {
  return (Object.keys(STYLE_FIT_RULES) as AllocationBucket[]).reduce((score, bucket) => {
    const rule = STYLE_FIT_RULES[bucket]
    const target = rule.target(targetAllocation)
    const distance = Math.max(0, Math.abs(currentAllocation[bucket] - target) - rule.tolerance)
    const normalizedPenalty = Math.min(distance / rule.maxDistance, 1)

    return score + rule.maxScore * (1 - normalizedPenalty)
  }, 0)
}

function getTotalValue(positions: PortfolioPosition[]): number {
  return positions.reduce((sum, position) => sum + position.value, 0)
}

function scoreTopOne(topHoldingWeight: number): number {
  if (topHoldingWeight <= 15) return 10
  if (topHoldingWeight <= 25) return 8
  if (topHoldingWeight <= 35) return 5
  if (topHoldingWeight <= 50) return 2
  return 0
}

function scoreTopThree(topThreeWeight: number): number {
  if (topThreeWeight <= 40) return 10
  if (topThreeWeight <= 55) return 8
  if (topThreeWeight <= 70) return 5
  if (topThreeWeight <= 85) return 2
  return 0
}

function scoreSector(maxSectorWeight: number): number {
  if (maxSectorWeight <= 25) return 5
  if (maxSectorWeight <= 40) return 4
  if (maxSectorWeight <= 55) return 2
  return 0
}

function getStyleAdjustment(desiredStyle: StyleKey): number {
  if (desiredStyle === 'aggressive') return 1
  if (desiredStyle === 'stable') return -1
  return 0
}

function getDiversificationScore(
  positions: PortfolioPosition[],
  desiredStyle: StyleKey,
): number {
  const totalValue = getTotalValue(positions)
  if (totalValue <= 0) return 0

  const holdings = positions
    .filter(position => !isCashPosition(position))
    .slice()
    .sort((left, right) => right.value - left.value)

  const topHoldingWeight = holdings[0] ? (holdings[0].value / totalValue) * 100 : 0
  const topThreeWeight = holdings
    .slice(0, 3)
    .reduce((sum, holding) => sum + (holding.value / totalValue) * 100, 0)

  const sectorValues: Record<string, number> = {}
  for (const position of holdings) {
    if (position.sector === '기타') continue
    sectorValues[position.sector] = (sectorValues[position.sector] ?? 0) + position.value
  }

  const maxSectorWeight = Object.values(sectorValues).reduce(
    (max, sectorValue) => Math.max(max, (sectorValue / totalValue) * 100),
    0,
  )

  const styleAdjustment = getStyleAdjustment(desiredStyle)
  const topOneScore = clamp(scoreTopOne(topHoldingWeight) + styleAdjustment, 0, 10)
  const topThreeScore = clamp(scoreTopThree(topThreeWeight) + styleAdjustment, 0, 10)

  return topOneScore + topThreeScore + scoreSector(maxSectorWeight)
}

function scoreHoldingCount(holdingCount: number): number {
  if (holdingCount <= 0) return 0
  if (holdingCount <= 2) return 2
  if (holdingCount <= 5) return 6
  if (holdingCount <= 12) return 10
  if (holdingCount <= 20) return 7
  return 3
}

function scoreOtherWeight(otherWeight: number): number {
  if (otherWeight <= 10) return 5
  if (otherWeight <= 20) return 4
  if (otherWeight <= 30) return 2
  return 0
}

function getSimplicityScore(
  currentAllocation: Record<AllocationBucket, number>,
  positions: PortfolioPosition[],
): number {
  const holdingCount = positions.filter(position => !isCashPosition(position)).length

  return scoreHoldingCount(holdingCount) + scoreOtherWeight(currentAllocation['기타'])
}

export function computeHealthScore(
  currentAllocation: Record<AllocationBucket, number>,
  targetAllocation: TargetAllocation,
  positions: PortfolioPosition[],
  desiredStyle: StyleKey,
): number {
  const styleFitScore = getStyleFitScore(currentAllocation, targetAllocation)
  const diversificationScore = getDiversificationScore(positions, desiredStyle)
  const simplicityScore = getSimplicityScore(currentAllocation, positions)

  return clamp(Math.round(styleFitScore + diversificationScore + simplicityScore), 0, 100)
}

export function computeIdealScore(
  currentAllocation: Record<AllocationBucket, number>,
  positions: PortfolioPosition[],
  desiredStyle: StyleKey,
): number {
  const diversificationScore = getDiversificationScore(positions, desiredStyle)
  const simplicityScore = getSimplicityScore(currentAllocation, positions)

  return clamp(Math.round(MAX_STYLE_FIT_SCORE + diversificationScore + simplicityScore), 0, 100)
}
