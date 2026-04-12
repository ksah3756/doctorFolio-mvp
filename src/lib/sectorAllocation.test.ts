import { describe, expect, it } from 'vitest'
import { buildSectorAllocation } from './sectorAllocation'
import type { PortfolioPosition } from './types'

function makePosition(
  overrides: Partial<PortfolioPosition> & Pick<PortfolioPosition, 'id' | 'name' | 'value'>,
): PortfolioPosition {
  const { id, name, value, ...rest } = overrides

  return {
    id,
    name,
    code: 'TEST',
    qty: 1,
    value,
    avgCost: value,
    currentPrice: value,
    assetClass: '국내주식',
    sector: '기타',
    sourceImage: 1,
    ...rest,
  }
}

describe('buildSectorAllocation', () => {
  it('aggregates values by sector and sorts by descending weight', () => {
    const slices = buildSectorAllocation([
      makePosition({ id: '1', name: '삼성전자', value: 4_000_000, sector: '반도체' }),
      makePosition({ id: '2', name: 'SK하이닉스', value: 2_000_000, sector: '반도체' }),
      makePosition({ id: '3', name: '현대차', value: 3_000_000, sector: '자동차' }),
      makePosition({ id: '4', name: 'KT', value: 1_000_000, sector: '통신' }),
    ])

    expect(slices).toEqual([
      { sector: '반도체', value: 6_000_000, share: 60 },
      { sector: '자동차', value: 3_000_000, share: 30 },
      { sector: '통신', value: 1_000_000, share: 10 },
    ])
  })

  it('uses 기타 when the sector name is blank', () => {
    const slices = buildSectorAllocation([
      makePosition({ id: '1', name: '정체불명 자산', value: 2_000_000, sector: '   ' }),
      makePosition({ id: '2', name: '삼성전자', value: 8_000_000, sector: '반도체' }),
    ])

    expect(slices).toEqual([
      { sector: '반도체', value: 8_000_000, share: 80 },
      { sector: '기타', value: 2_000_000, share: 20 },
    ])
  })

  it('groups smaller sectors into 기타 외 when slice count exceeds the limit', () => {
    const slices = buildSectorAllocation([
      makePosition({ id: '1', name: 'A', value: 4_000_000, sector: '반도체' }),
      makePosition({ id: '2', name: 'B', value: 2_000_000, sector: '자동차' }),
      makePosition({ id: '3', name: 'C', value: 1_500_000, sector: '통신' }),
      makePosition({ id: '4', name: 'D', value: 1_000_000, sector: '은행' }),
      makePosition({ id: '5', name: 'E', value: 900_000, sector: '보험' }),
      makePosition({ id: '6', name: 'F', value: 600_000, sector: '에너지' }),
    ])

    expect(slices).toEqual([
      { sector: '반도체', value: 4_000_000, share: 40 },
      { sector: '자동차', value: 2_000_000, share: 20 },
      { sector: '통신', value: 1_500_000, share: 15 },
      { sector: '은행', value: 1_000_000, share: 10 },
      { sector: '기타 외', value: 1_500_000, share: 15 },
    ])
  })

  it('returns an empty list for an empty portfolio', () => {
    expect(buildSectorAllocation([])).toEqual([])
  })
})
