import type { PortfolioPosition } from './types'

export interface SectorAllocationSlice {
  sector: string
  value: number
  share: number
}

const FALLBACK_SECTOR = '기타'

function roundShare(value: number, total: number): number {
  return Math.round((value / total) * 1000) / 10
}

export function buildSectorAllocation(
  positions: PortfolioPosition[],
  maxSlices = 5,
): SectorAllocationSlice[] {
  const totalValue = positions.reduce((sum, position) => sum + position.value, 0)

  if (totalValue <= 0 || positions.length === 0) {
    return []
  }

  const bySector = new Map<string, number>()

  for (const position of positions) {
    const sector = position.sector.trim() || FALLBACK_SECTOR
    bySector.set(sector, (bySector.get(sector) ?? 0) + position.value)
  }

  const sortedSlices = Array.from(bySector.entries())
    .map(([sector, value]) => ({
      sector,
      value,
      share: roundShare(value, totalValue),
    }))
    .sort((left, right) => right.value - left.value)

  if (sortedSlices.length <= maxSlices) {
    return sortedSlices
  }

  const visibleSlices = sortedSlices.slice(0, maxSlices - 1)
  const groupedValue = sortedSlices
    .slice(maxSlices - 1)
    .reduce((sum, slice) => sum + slice.value, 0)

  return [
    ...visibleSlices,
    {
      sector: '기타 외',
      value: groupedValue,
      share: roundShare(groupedValue, totalValue),
    },
  ]
}
