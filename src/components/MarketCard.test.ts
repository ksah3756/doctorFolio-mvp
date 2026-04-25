import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MARKET_CARD_TITLES, MarketCard } from './MarketCard'

describe('MarketCard', () => {
  it('닫힌 상태에서 프로토타입형 헤더를 렌더링한다', () => {
    const html = renderToStaticMarkup(
      createElement(MarketCard, {
        indicator: {
          detailSource: '출처: multpl.com + FRED | Earnings Yield 3.2% − DGS10 4.3% = -1.1%p',
          detailTitle: 'ERP (주식−채권 상대매력)',
          detailValue: '실제 값: -1.1%p',
          guide: '분할 접근보다 방어 자산 비중을 점검해보세요.',
          key: 'erp',
          label: 'ERP',
          status: 'negative',
          summary: '채권 금리 매력이 더 커 보여 주식에 높은 점수를 주기 어려운 구간이에요.',
          value: '-0.7%p',
        },
      }),
    )

    expect(html).toContain('주식 vs 채권 매력도')
    expect(html).toContain('지금 주식이 채권보다 더 매력적인가요?')
    expect(html).toContain('주의')
    expect(html).toContain('aria-expanded="false"')
  })

  it('프로토타입에 맞는 5개 카드 타이틀을 모두 유지한다', () => {
    expect(MARKET_CARD_TITLES).toEqual({
      fearGreed: '시장 심리',
      yieldCurve: '경기 신호등',
      erp: '주식 vs 채권 매력도',
      creditSpread: '기업 부도 위험',
      m2: '시중 돈의 양',
    })
  })
})
