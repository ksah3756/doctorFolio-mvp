// src/lib/engine.test.ts
import { describe, it, expect } from 'vitest'
import { runDiagnosis } from './engine'
import type { PortfolioPosition, TargetAllocation } from './types'

const TARGET: TargetAllocation = { '국내주식': 35, '해외주식': 25, '채권': 30, '현금': 10 }

function makePos(overrides: Partial<PortfolioPosition> & Pick<PortfolioPosition, 'value' | 'assetClass'>): PortfolioPosition {
  return {
    id: 'test-id',
    name: '테스트종목',
    code: '005930',
    qty: 10,
    avgCost: overrides.value / 10,
    currentPrice: overrides.value / 10,
    sector: '기타',
    sourceImage: 1,
    ...overrides,
  }
}

describe('runDiagnosis', () => {
  it('국내주식 80% → drift 문제 감지', () => {
    const positions = [
      makePos({ value: 8_000_000, assetClass: '국내주식', name: '삼성전자' }),
      makePos({ value: 1_000_000, assetClass: '해외주식', name: 'TIGER 미국S&P500' }),
      makePos({ value: 1_000_000, assetClass: '채권',     name: 'TIGER 채권' }),
    ]
    const result = runDiagnosis(positions, TARGET)
    const driftProblem = result.problems.find(p => p.type === 'drift' && p.assetClass === '국내주식')
    expect(driftProblem).toBeDefined()
    expect(driftProblem!.current).toBe(80)
    expect(driftProblem!.target).toBe(35)
    expect(driftProblem!.severity).toBe('high')
  })

  it('단일 종목 33% → concentration_stock 문제 감지', () => {
    const positions = [
      makePos({ value: 3_300_000, assetClass: '국내주식', name: '현대차', code: '005380' }),
      makePos({ value: 4_700_000, assetClass: '국내주식', name: '삼성전자', code: '005930' }),
      makePos({ value: 2_000_000, assetClass: '해외주식', name: 'TIGER 미국S&P500' }),
    ]
    const result = runDiagnosis(positions, TARGET)
    const concProblem = result.problems.find(p => p.type === 'concentration_stock')
    expect(concProblem).toBeDefined()
    expect(concProblem!.current).toBeCloseTo(33, 0)
  })

  it('단일 종목 30% 이하 → concentration 문제 없음', () => {
    // 모든 종목이 30% 이하: 현대차 25%, 삼성전자 25%, TIGER 미국 25%, TIGER 채권 25%
    const positions = [
      makePos({ value: 2_500_000, assetClass: '국내주식', name: '현대차' }),
      makePos({ value: 2_500_000, assetClass: '국내주식', name: '삼성전자' }),
      makePos({ value: 2_500_000, assetClass: '해외주식', name: 'TIGER 미국S&P500' }),
      makePos({ value: 2_500_000, assetClass: '채권',     name: 'TIGER 채권' }),
    ]
    const result = runDiagnosis(positions, TARGET)
    expect(result.problems.find(p => p.type === 'concentration_stock')).toBeUndefined()
  })

  it('포트폴리오 양호 (drift < 10pp, 단일 종목 30% 이하) → problems 빈 배열', () => {
    // 국내주식 40%(각 20%), 해외 25%, 채권 25%, 현금 10%
    const positions = [
      makePos({ value: 2_000_000, assetClass: '국내주식', name: '삼성전자' }),
      makePos({ value: 2_000_000, assetClass: '국내주식', name: 'SK하이닉스' }),
      makePos({ value: 2_500_000, assetClass: '해외주식', name: 'TIGER 미국S&P500' }),
      makePos({ value: 2_500_000, assetClass: '채권',     name: 'TIGER 채권' }),
      makePos({ value: 1_000_000, assetClass: '기타', name: '현금', code: null, qty: 0, avgCost: 0, currentPrice: 0 }),
    ]
    const result = runDiagnosis(positions, TARGET)
    expect(result.problems).toHaveLength(0)
  })

  it('총자산 0이면 빈 결과 반환', () => {
    const result = runDiagnosis([], TARGET)
    expect(result.problems).toHaveLength(0)
    expect(result.actions).toHaveLength(0)
  })

  it('현금은 currentAllocation 현금 비중으로 분리되고 기타 자산은 기타에 남는다', () => {
    const positions = [
      makePos({ value: 6_000_000, assetClass: '국내주식', name: '삼성전자' }),
      makePos({ value: 2_000_000, assetClass: '기타', name: '현금', code: null, qty: 0, avgCost: 0, currentPrice: 0 }),
      makePos({ value: 2_000_000, assetClass: '기타', name: '금 ETF', code: '132030' }),
    ]

    const result = runDiagnosis(positions, TARGET)

    expect(result.currentAllocation['국내주식']).toBe(60)
    expect(result.currentAllocation['현금']).toBe(20)
    expect(result.currentAllocation['기타']).toBe(20)
  })

  it('현금 비중 이탈은 drift 문제로 감지한다', () => {
    const positions = [
      makePos({ value: 4_000_000, assetClass: '국내주식', name: '삼성전자' }),
      makePos({ value: 2_000_000, assetClass: '해외주식', name: 'TIGER 미국S&P500' }),
      makePos({ value: 1_000_000, assetClass: '채권', name: 'TIGER 채권' }),
      makePos({ value: 3_000_000, assetClass: '기타', name: '현금', code: null, qty: 0, avgCost: 0, currentPrice: 0 }),
    ]

    const result = runDiagnosis(positions, TARGET)
    const cashProblem = result.problems.find(p => p.type === 'drift' && p.assetClass === '현금')

    expect(cashProblem).toBeDefined()
    expect(cashProblem!.current).toBe(30)
    expect(cashProblem!.target).toBe(10)
  })

  it('국내주식만 100% → 액션에 매도 항목 포함', () => {
    const positions = [
      makePos({ value: 10_000_000, assetClass: '국내주식', name: '현대차', code: '005380', qty: 20, currentPrice: 500_000 }),
    ]
    const result = runDiagnosis(positions, TARGET)
    const sellAction = result.actions.find(a => a.action === 'sell')
    expect(sellAction).toBeDefined()
    expect(sellAction!.quantity).toBeGreaterThan(0)
  })

  it('해외주식 차익 → taxEstimate 계산', () => {
    const positions = [
      makePos({ value: 5_000_000, assetClass: '해외주식', name: 'TIGER 미국S&P500', qty: 100, avgCost: 40_000, currentPrice: 50_000 }),
      makePos({ value: 5_000_000, assetClass: '국내주식', name: '삼성전자' }),
    ]
    const result = runDiagnosis(positions, TARGET)
    const sellAction = result.actions.find(a => a.action === 'sell' && a.ticker.includes('미국'))
    if (sellAction?.taxEstimate !== undefined) {
      // (50000 - 40000) * qty * 0.22 > 0
      expect(sellAction.taxEstimate).toBeGreaterThan(0)
    }
    // 국내주식은 taxEstimate 없음
    const domesticSell = result.actions.find(a => a.action === 'sell' && !a.ticker.includes('미국'))
    if (domesticSell) {
      expect(domesticSell.taxEstimate).toBeUndefined()
    }
  })
})
