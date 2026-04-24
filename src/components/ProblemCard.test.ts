import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProblemCard } from './ProblemCard'

describe('ProblemCard', () => {
  it('drift 문제를 현재/목표 비교 박스와 설명으로 보여준다', () => {
    const html = renderToStaticMarkup(
      createElement(ProblemCard, {
        index: 0,
        problem: {
          type: 'drift',
          severity: 'high',
          assetClass: '국내주식',
          current: 50,
          target: 35,
          label: '국내주식에 너무 쏠려 있습니다',
          description: '현재 50%로 목표(35%)보다 15%p 높습니다.',
        },
      }),
    )

    expect(html).toContain('01 · 자산 배분')
    expect(html).toContain('고위험')
    expect(html).toContain('현재')
    expect(html).toContain('50%')
    expect(html).toContain('목표')
    expect(html).toContain('35%')
    expect(html).toContain('현재 50%로 목표(35%)보다 15%p 높습니다.')
  })

  it('집중 문제는 기준선 레이블과 설명을 보여준다', () => {
    const html = renderToStaticMarkup(
      createElement(ProblemCard, {
        index: 1,
        problem: {
          type: 'concentration_sector',
          severity: 'medium',
          sector: '반도체',
          current: 62,
          target: 50,
          label: '반도체 섹터가 62%입니다',
          description: '단일 섹터 50% 초과는 섹터 집중 위험입니다.',
        },
      }),
    )

    expect(html).toContain('02 · 섹터 집중')
    expect(html).toContain('주의')
    expect(html).toContain('현재')
    expect(html).toContain('62%')
    expect(html).toContain('기준선')
    expect(html).toContain('50%')
    expect(html).toContain('단일 섹터 50% 초과는 섹터 집중 위험입니다.')
  })
})
