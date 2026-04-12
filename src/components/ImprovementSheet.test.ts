import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ImprovementSheet, getImprovementRows } from './ImprovementSheet'

describe('getImprovementRows', () => {
  it('tolerance 이내 차이는 중립 상태로 처리한다', () => {
    const rows = getImprovementRows(
      { '국내주식': 39, '해외주식': 25, '채권': 27, '현금': 12, '기타': 2 },
      { '국내주식': 35, '해외주식': 25, '채권': 30, '현금': 10 },
    )

    expect(rows.find(row => row.key === '국내주식')).toMatchObject({
      deltaLabel: '—',
      withinTolerance: true,
    })
    expect(rows.find(row => row.key === '현금')).toMatchObject({
      deltaLabel: '—',
      withinTolerance: true,
    })
  })

  it('tolerance 초과 차이는 방향과 pp를 표시한다', () => {
    const rows = getImprovementRows(
      { '국내주식': 50, '해외주식': 10, '채권': 25, '현금': 10, '기타': 5 },
      { '국내주식': 35, '해외주식': 25, '채권': 30, '현금': 10 },
    )

    expect(rows.find(row => row.key === '국내주식')).toMatchObject({
      deltaLabel: '▲15pp',
      withinTolerance: false,
    })
    expect(rows.find(row => row.key === '해외주식')).toMatchObject({
      deltaLabel: '▼15pp',
      withinTolerance: false,
    })
    expect(rows.find(row => row.key === '기타')).toMatchObject({
      target: 0,
      deltaLabel: '▲5pp',
      withinTolerance: false,
    })
  })
})

describe('ImprovementSheet', () => {
  it('점수 비교와 목표 섹션을 함께 렌더링한다', () => {
    const html = renderToStaticMarkup(
      createElement(ImprovementSheet, {
        currentAllocation: { '국내주식': 50, '해외주식': 10, '채권': 25, '현금': 10, '기타': 5 },
        targetAllocation: { '국내주식': 35, '해외주식': 25, '채권': 30, '현금': 10 },
        currentScore: 48,
        idealScore: 72,
        onClose: () => {},
        open: true,
      }),
    )

    expect(html).toContain('현재')
    expect(html).toContain('48점')
    expect(html).toContain('개선 시')
    expect(html).toContain('72점')
    expect(html).toContain('목표 포트폴리오')
    expect(html).toContain('▲15pp')
    expect(html).toContain('✓')
  })
})
