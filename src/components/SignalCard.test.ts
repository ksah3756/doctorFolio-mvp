import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SignalCard } from './SignalCard'

describe('SignalCard', () => {
  it('닫힌 상태의 요약 카드 헤더를 렌더링한다', () => {
    const html = renderToStaticMarkup(
      createElement(SignalCard, {
        sector: '반도체',
        signal: {
          companyName: '현대차',
          confidence: 'high',
          confidenceSummary: '여러 핵심 지표가 같은 방향을 가리키고 있어요.',
          currentPrice: 123_500,
          expertDetails: [
            {
              contribution: '+0.42',
              description: 'RSI 42.3: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 비교적 부담이 낮은 구간으로 해석됩니다.',
              key: 'rsi',
              status: '완만한 저점권',
              title: 'RSI',
              value: 'RSI 42.3',
            },
            {
              contribution: '+1.20',
              description: 'MACD Histogram +0.82: MACD가 Signal 선보다 위에 있으며, 전일 대비 개선되고 있습니다.',
              key: 'macd',
              status: '상승 흐름',
              title: 'MACD',
              value: 'MACD Histogram +0.82',
            },
            {
              contribution: '+0.60',
              description: '거래량 1.8배: 최근 20일 평균 거래량 대비 현재 거래량이에요. 최근 3일 수익률은 +2.1%입니다.',
              key: 'volume',
              status: '관심 증가',
              title: '거래량',
              value: '거래량 1.8배',
            },
            {
              contribution: '+0.32',
              description: '52주 위치 하위 35%: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 1년 가격 범위에서 비교적 낮은 편이에요.',
              key: 'fiftyTwoWeek',
              status: '낮은 가격대',
              title: '52주 위치',
              value: '52주 위치 하위 35%',
            },
            {
              contribution: null,
              description: '6개월 평균 대비 -4.2%: 현재가가 6개월 평균과 크게 다르지 않아 중기 기준으로는 중립 구간이에요.',
              key: 'sixMonthAverage',
              status: '중립',
              title: '6개월 평균 대비',
              value: '6개월 평균 대비 -4.2%',
            },
            {
              contribution: null,
              description: '최근 30일 내부자 순매수가 보여 회사 안쪽 인물들이 주가를 긍정적으로 보는 신호로 읽을 수 있어요.',
              key: 'insider',
              status: '순매수 우위',
              title: '내부자 매매',
              value: '매수 2건 / 매도 0건',
            },
          ],
          fetchedAt: '2026-04-24T00:00:00.000Z',
          label: '분할매수 고려',
          market: 'KR',
          marketSymbol: '005380.KS',
          metrics: [
            {
              contribution: 0.42,
              description: 'RSI 42.3: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 비교적 부담이 낮은 구간으로 해석됩니다.',
              includedInScore: true,
              key: 'rsi',
              label: '단기 과열 여부',
              signal: 'buy',
              status: '완만한 저점권',
              strength: 0.35,
              summary: '과열은 아니고, 비교적 부담이 낮은 구간이에요.',
              value: 'RSI 42.3',
              weight: 1.2,
            },
            {
              contribution: 1.2,
              description: 'MACD Histogram +0.82: MACD가 Signal 선보다 위에 있으며, 전일 대비 개선되고 있습니다.',
              includedInScore: true,
              key: 'macd',
              label: '추세 방향',
              signal: 'buy',
              status: '상승 흐름',
              strength: 0.8,
              summary: '상승 흐름이 이어지고 있어요.',
              value: 'MACD Histogram +0.82',
              weight: 1.5,
            },
            {
              contribution: 0.6,
              description: '거래량 1.8배: 최근 20일 평균 거래량 대비 현재 거래량이에요. 최근 3일 수익률은 +2.1%입니다.',
              includedInScore: true,
              key: 'volume',
              label: '거래 활발도',
              signal: 'buy',
              status: '관심 증가',
              strength: 0.46,
              summary: '평소보다 거래가 늘면서 관심이 붙고 있어요.',
              value: '거래량 1.8배',
              weight: 1.3,
            },
            {
              contribution: 0.32,
              description: '52주 위치 하위 35%: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 1년 가격 범위에서 비교적 낮은 편이에요.',
              includedInScore: true,
              key: 'fiftyTwoWeek',
              label: '가격 위치',
              signal: 'buy',
              status: '낮은 가격대',
              strength: 0.35,
              summary: '1년 가격 범위에서 비교적 낮은 편이에요.',
              value: '52주 위치 하위 35%',
              weight: 0.9,
            },
          ],
          normalizedScore: 0.52,
          recommendation: 'buy',
          referenceMetrics: [
            {
              contribution: 0,
              description: '6개월 평균 대비 -4.2%: 현재가가 6개월 평균과 크게 다르지 않아 중기 기준으로는 중립 구간이에요.',
              includedInScore: false,
              key: 'sixMonthAverage',
              label: '6개월 평균 대비',
              signal: 'neutral',
              status: '중립',
              strength: 0,
              summary: '현재가가 6개월 평균과 크게 다르지 않아요.',
              value: '6개월 평균 대비 -4.2%',
              weight: 0,
            },
            {
              contribution: 0,
              description: '최근 30일 내부자 순매수가 보여 회사 안쪽 인물들이 주가를 긍정적으로 보는 신호로 읽을 수 있어요.',
              includedInScore: false,
              key: 'insider',
              label: '내부자 매매',
              signal: 'buy',
              status: '순매수 우위',
              strength: 0,
              summary: '최근 30일 내부자 순매수가 보여요.',
              value: '매수 2건 / 매도 0건',
              weight: 0,
            },
          ],
          score: 76,
          summary: '가격도 합리적인 편이고 상승 신호가 나오고 있어요. 한 번에 사기보다 조금씩 나눠서 보는 게 좋아요.',
          ticker: '005380',
          week52High: 180_000,
          week52Low: 88_000,
        },
      }),
    )

    expect(html).toContain('현대차')
    expect(html).toContain('76')
    expect(html).toContain('분할매수 고려')
    expect(html).toContain('반도체')
    expect(html).toContain('신뢰도 높음')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('가격도 합리적인 편이고 상승 신호가 나오고 있어요.')
  })
})
