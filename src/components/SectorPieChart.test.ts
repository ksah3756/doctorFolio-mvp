import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SectorPieChart } from './SectorPieChart'

describe('SectorPieChart', () => {
  it('빈 섹터 데이터면 아무 것도 렌더링하지 않는다', () => {
    const html = renderToStaticMarkup(
      createElement(SectorPieChart, {
        slices: [],
      }),
    )

    expect(html).toBe('')
  })

  it('섹터 데이터가 있으면 대표 섹터와 비중을 렌더링한다', () => {
    const html = renderToStaticMarkup(
      createElement(SectorPieChart, {
        slices: [
          { sector: '반도체', value: 6000000, share: 60 },
          { sector: '바이오', value: 4000000, share: 40 },
        ],
      }),
    )

    expect(html).toContain('섹터 비중')
    expect(html).toContain('최대 반도체')
    expect(html).toContain('60%')
    expect(html).toContain('바이오')
  })
})
