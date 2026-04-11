import { describe, expect, it } from 'vitest'
import { autoClassify } from './sectors'

describe('autoClassify', () => {
  it('uses the static sector DB for known stock names', () => {
    expect(autoClassify('삼성전자', '005930')).toEqual({
      sector: '반도체',
      assetClass: '국내주식',
    })
  })

  it('normalizes whitespace when matching stock names', () => {
    expect(autoClassify('SK 하이닉스', null)).toEqual({
      sector: '반도체',
      assetClass: '국내주식',
    })
  })

  it('treats alphabetic tickers as overseas stocks', () => {
    expect(autoClassify('Apple', 'AAPL')).toEqual({
      sector: '미국주식',
      assetClass: '해외주식',
    })
  })

  it('classifies ETF names by prefix and theme', () => {
    expect(autoClassify('TIGER 미국S&P500', null)).toEqual({
      sector: '미국ETF',
      assetClass: '해외주식',
    })
    expect(autoClassify('KODEX 국채선물', null)).toEqual({
      sector: '채권ETF',
      assetClass: '채권',
    })
  })

  it('falls back to domestic stock or 기타 when metadata is missing', () => {
    expect(autoClassify('어떤국내주식', '123456')).toEqual({
      sector: '기타',
      assetClass: '국내주식',
    })
    expect(autoClassify('정체불명 자산', null)).toEqual({
      sector: '기타',
      assetClass: '기타',
    })
  })
})
