import { describe, expect, it } from 'vitest'
import { autoClassify, SECTOR_LABELS } from './sectors'

describe('autoClassify', () => {
  it('exports the shared sector dropdown labels', () => {
    expect(SECTOR_LABELS).toHaveLength(30)
    expect(SECTOR_LABELS).toEqual([
      '에너지', '소재', '자본재', '전문서비스', '운수', '자동차', '내구소비재', '소비자서비스',
      '소매유통', '필수소비재유통', '식음료', '생활용품', '의료기기/서비스', '제약/바이오',
      '은행', '금융서비스', '보험', '소프트웨어', '하드웨어', '반도체',
      '통신', '미디어/엔터', '유틸리티', '리츠', '부동산',
      '미국ETF', '국내ETF', '채권ETF', '원자재ETF', '기타',
    ])
  })

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
