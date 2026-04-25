import { describe, expect, it } from 'vitest'
import { calculateDcfValuation, type DcfInput, type FinancialLineItem, type FinancialMetric } from './dcfValuation'

function makeMetric(overrides: FinancialMetric = {}): FinancialMetric {
  return {
    revenue: 1200,
    ebit: 240,
    freeCashFlow: 180,
    ...overrides,
  }
}

function makeLineItem(overrides: FinancialLineItem = {}): FinancialLineItem {
  return {
    revenue: 1200,
    ebit: 240,
    freeCashFlow: 180,
    depreciationAndAmortization: 30,
    capitalExpenditure: -40,
    workingCapital: 100,
    currentAssets: 300,
    currentLiabilities: 200,
    totalDebt: 200,
    interestExpense: -10,
    cashAndEquivalents: 80,
    outstandingShares: 10,
    ...overrides,
  }
}

function makeInput(overrides: Partial<DcfInput> = {}): DcfInput {
  return {
    metrics: [
      makeMetric(),
      makeMetric({ revenue: 1150, ebit: 210, freeCashFlow: 150 }),
      makeMetric({ revenue: 1100, ebit: 180, freeCashFlow: 120 }),
    ],
    lineItems: [
      makeLineItem(),
      makeLineItem({ revenue: 1150, workingCapital: 90, currentAssets: 280, currentLiabilities: 190 }),
      makeLineItem({ revenue: 1100, workingCapital: 70, currentAssets: 250, currentLiabilities: 180 }),
    ],
    marketCap: 1000,
    damodaran: {
      riskFreeRate: 0.043,
      equityRiskPremium: 0.047,
      industryUnleveredBeta: 0.9,
      companyBeta: 1.2,
      taxRate: 0.21,
    },
    projectionYears: 5,
    terminalGrowth: 0.025,
    ...overrides,
  }
}

describe('calculateDcfValuation', () => {
  it('returns null for empty metrics', () => {
    expect(calculateDcfValuation(makeInput({ metrics: [] }))).toBeNull()
  })

  it('returns null for empty lineItems', () => {
    expect(calculateDcfValuation(makeInput({ lineItems: [] }))).toBeNull()
  })

  it('returns null when shares are zero', () => {
    expect(calculateDcfValuation(makeInput({
      lineItems: [makeLineItem({ outstandingShares: 0 }), makeLineItem()],
    }))).toBeNull()
  })

  it('returns null when base fcff is not positive', () => {
    expect(calculateDcfValuation(makeInput({
      lineItems: [
        makeLineItem({
          ebit: 10,
          depreciationAndAmortization: 0,
          capitalExpenditure: -100,
          workingCapital: 180,
        }),
        makeLineItem({ workingCapital: 90 }),
      ],
    }))).toBeNull()
  })

  it('returns null when wacc is below terminal growth', () => {
    expect(calculateDcfValuation(makeInput({
      damodaran: {
        riskFreeRate: 0.01,
        equityRiskPremium: -0.02,
        companyBeta: 0.5,
        taxRate: 0.21,
      },
      terminalGrowth: 0.08,
    }))).toBeNull()
  })

  it('calculates FCFF from EBIT, D&A, capex, and delta working capital', () => {
    const result = calculateDcfValuation(makeInput())

    expect(result).not.toBeNull()
    expect(result!.assumptions.baseFcff).toBeCloseTo(169.6, 5)
    expect(result!.diagnostics.deltaNwcUnavailable).toBe(false)
  })

  it('falls back to free cash flow when EBIT path data is missing', () => {
    const result = calculateDcfValuation(makeInput({
      lineItems: [
        makeLineItem({ ebit: undefined, freeCashFlow: 155 }),
        makeLineItem(),
      ],
    }))

    expect(result).not.toBeNull()
    expect(result!.assumptions.baseFcff).toBe(155)
  })

  it('marks delta working capital unavailable when only one period exists', () => {
    const result = calculateDcfValuation(makeInput({
      lineItems: [makeLineItem()],
    }))

    expect(result).not.toBeNull()
    expect(result!.diagnostics.deltaNwcUnavailable).toBe(true)
  })

  it('clamps wacc to the configured ceiling', () => {
    const result = calculateDcfValuation(makeInput({
      marketCap: 100,
      lineItems: [
        makeLineItem({ totalDebt: 900, interestExpense: -270 }),
        makeLineItem({ totalDebt: 850, interestExpense: -255 }),
      ],
      damodaran: {
        riskFreeRate: 0.08,
        equityRiskPremium: 0.1,
        companyBeta: 3,
        taxRate: 0.21,
      },
    }))

    expect(result).not.toBeNull()
    expect(result!.assumptions.rawWacc).toBeGreaterThan(0.15)
    expect(result!.assumptions.wacc).toBe(0.15)
    expect(result!.diagnostics.waccClamped).toBe(true)
  })

  it('classifies reasonable valuations', () => {
    const result = calculateDcfValuation(makeInput())

    expect(result?.diagnostics.quality).toBe('reasonable')
  })

  it('classifies high growth valuations', () => {
    const result = calculateDcfValuation(makeInput({
      metrics: [
        makeMetric({ revenue: 1600 }),
        makeMetric({ revenue: 1000 }),
        makeMetric({ revenue: 700 }),
      ],
    }))

    expect(result?.diagnostics.quality).toBe('medium_confidence_high_growth')
  })

  it('classifies terminal value dominant valuations', () => {
    const result = calculateDcfValuation(makeInput({
      terminalGrowth: 0.04,
      damodaran: {
        riskFreeRate: 0.07,
        equityRiskPremium: 0.01,
        companyBeta: 0.5,
        taxRate: 0.21,
      },
    }))

    expect(result?.diagnostics.quality).toBe('low_confidence_terminal_value_dominant')
  })

  it('classifies thin wacc spread valuations', () => {
    const result = calculateDcfValuation(makeInput({
      terminalGrowth: 0.055,
      damodaran: {
        riskFreeRate: 0.02,
        equityRiskPremium: 0,
        companyBeta: 0,
        taxRate: 0.21,
      },
    }))

    expect(result?.diagnostics.quality).toBe('low_confidence_thin_wacc_spread')
  })

  it('classifies negative equity valuations as invalid', () => {
    const result = calculateDcfValuation(makeInput({
      marketCap: 100,
      lineItems: [
        makeLineItem({
          freeCashFlow: 5,
          ebit: undefined,
          totalDebt: 2000,
          cashAndEquivalents: 0,
          outstandingShares: 10,
        }),
        makeLineItem({ totalDebt: 2000, cashAndEquivalents: 0 }),
      ],
      damodaran: {
        riskFreeRate: 0.12,
        equityRiskPremium: 0.12,
        companyBeta: 3,
        taxRate: 0.21,
      },
    }))

    expect(result?.diagnostics.quality).toBe('invalid')
    expect(result?.diagnostics.negativeEquity).toBe(true)
  })

  it('returns positive margin of safety for undervalued case', () => {
    const result = calculateDcfValuation(makeInput())

    expect(result).not.toBeNull()
    expect(result!.marginOfSafety).toBeGreaterThan(0)
  })

  it('returns negative margin of safety for overvalued case', () => {
    const result = calculateDcfValuation(makeInput({
      marketCap: 5000,
    }))

    expect(result).not.toBeNull()
    expect(result!.marginOfSafety).toBeLessThan(0)
  })
})
