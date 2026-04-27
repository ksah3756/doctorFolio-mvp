type NullableNumber = number | null | undefined

export interface FinancialMetric {
  revenue?: NullableNumber
  ebit?: NullableNumber
  freeCashFlow?: NullableNumber
}

export interface FinancialLineItem {
  revenue?: NullableNumber
  ebit?: NullableNumber
  freeCashFlow?: NullableNumber
  depreciationAndAmortization?: NullableNumber
  capitalExpenditure?: NullableNumber
  workingCapital?: NullableNumber
  currentAssets?: NullableNumber
  currentLiabilities?: NullableNumber
  totalDebt?: NullableNumber
  interestExpense?: NullableNumber
  cashAndEquivalents?: NullableNumber
  outstandingShares?: NullableNumber
}

export interface DamodaranInputs {
  riskFreeRate: number
  equityRiskPremium: number
  industryUnleveredBeta?: number
  companyBeta?: number
  taxRate?: number
}

export interface EbitConsensusEstimate {
  year: number
  ebit: number
}

export interface DcfInput {
  metrics: FinancialMetric[]
  lineItems: FinancialLineItem[]
  marketCap: number
  damodaran: DamodaranInputs
  projectionYears?: number
  terminalGrowth?: number
  consensusEbitEstimates?: EbitConsensusEstimate[]
}

export type DcfQuality =
  | 'reasonable'
  | 'medium_confidence_high_growth'
  | 'low_confidence_terminal_value_dominant'
  | 'low_confidence_thin_wacc_spread'
  | 'invalid'

export interface DcfResult {
  enterpriseValue: number
  equityValue: number
  intrinsicValuePerShare: number
  marginOfSafety: number
  assumptions: {
    baseFcff: number
    baseGrowth: number
    terminalGrowth: number
    wacc: number
    rawWacc: number
    costOfEquity: number
    afterTaxCostOfDebt: number
    leveredBeta: number
    taxRate: number
    projectionYears: number
  }
  diagnostics: {
    pvExplicitFcff: number
    pvTerminalValue: number
    terminalValueWeight: number
    consensusYears: number
    quality: DcfQuality
    waccClamped: boolean
    deltaNwcUnavailable: boolean
    negativeEquity: boolean
  }
  projections: Array<{
    year: number
    ebit: number | null
    growth: number
    fcff: number
    presentValue: number
    source: 'consensus' | 'model'
  }>
}

export interface ProjectedEbitPoint {
  year: number
  ebit: number
  growth: number
  source: 'consensus' | 'model'
}

const DEFAULT_BASE_GROWTH = 0.04
const DEFAULT_COST_OF_DEBT = 0.05
const DEFAULT_PROJECTION_YEARS = 5
const DEFAULT_TAX_RATE = 0.21
const DEFAULT_TERMINAL_GROWTH = 0.025
const MAX_BASE_GROWTH = 0.12
const MAX_WACC = 0.15
const MIN_BASE_GROWTH = -0.05
const MIN_WACC = 0.06
const TERMINAL_VALUE_DOMINANT_THRESHOLD = 0.75
const THIN_WACC_SPREAD_THRESHOLD = 0.02

export function calculateDcfValuation(input: DcfInput): DcfResult | null {
  if (input.metrics.length === 0 || input.lineItems.length === 0) {
    return null
  }

  const latestLineItem = input.lineItems[0]
  const projectionYears = Math.max(1, Math.trunc(input.projectionYears ?? DEFAULT_PROJECTION_YEARS))
  const terminalGrowth = input.terminalGrowth ?? DEFAULT_TERMINAL_GROWTH
  const taxRate = input.damodaran.taxRate ?? DEFAULT_TAX_RATE
  const outstandingShares = toFiniteNumber(latestLineItem.outstandingShares)

  if (outstandingShares === null || outstandingShares <= 0) {
    return null
  }

  const deltaNwc = computeDeltaNwc(input.lineItems)
  const baseProjection = computeBaseFcff(latestLineItem, taxRate, deltaNwc.value)

  if (baseProjection.baseFcff === null) {
    return null
  }

  if (baseProjection.baseEbit !== null && baseProjection.baseEbit <= 0) {
    return null
  }

  const totalDebt = Math.max(toFiniteNumber(latestLineItem.totalDebt) ?? 0, 0)
  const cashAndEquivalents = Math.max(toFiniteNumber(latestLineItem.cashAndEquivalents) ?? 0, 0)
  const capitalStructure = input.marketCap + totalDebt

  if (!(capitalStructure > 0)) {
    return null
  }

  const leveredBeta = computeLeveredBeta({
    companyBeta: input.damodaran.companyBeta,
    industryUnleveredBeta: input.damodaran.industryUnleveredBeta,
    marketCap: input.marketCap,
    taxRate,
    totalDebt,
  })
  const costOfEquity = input.damodaran.riskFreeRate + leveredBeta * input.damodaran.equityRiskPremium
  const preTaxCostOfDebt = computePreTaxCostOfDebt(latestLineItem.interestExpense, totalDebt)
  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRate)
  const equityWeight = input.marketCap / capitalStructure
  const debtWeight = totalDebt / capitalStructure
  const rawWacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt
  const wacc = clamp(rawWacc, MIN_WACC, MAX_WACC)

  if (wacc <= terminalGrowth) {
    return null
  }

  const baseGrowth = computeBaseGrowth(input.metrics, input.lineItems)
  const projections = buildProjections({
    baseEbit: baseProjection.baseEbit,
    baseFcff: baseProjection.baseFcff,
    baseGrowth,
    baseDepreciationAndAmortization: Math.max(
      toFiniteNumber(latestLineItem.depreciationAndAmortization) ?? 0,
      0,
    ),
    baseCapitalExpenditure: Math.abs(toFiniteNumber(latestLineItem.capitalExpenditure) ?? 0),
    baseDeltaNwc: deltaNwc.value,
    projectionYears,
    terminalGrowth,
    taxRate,
    wacc,
    consensusEbitEstimates: input.consensusEbitEstimates,
  })

  const pvExplicitFcff = sum(projections.map(projection => projection.presentValue))
  const finalProjection = projections[projections.length - 1]
  const terminalValue = finalProjection.fcff * (1 + terminalGrowth) / (wacc - terminalGrowth)
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, projectionYears)
  const enterpriseValue = pvExplicitFcff + pvTerminalValue
  const equityValue = enterpriseValue - totalDebt + cashAndEquivalents
  const marginOfSafety = (equityValue - input.marketCap) / input.marketCap
  const negativeEquity = equityValue < 0
  const consensusYears = projections.filter(projection => projection.source === 'consensus').length
  const terminalValueWeight = enterpriseValue === 0 ? 0 : pvTerminalValue / enterpriseValue

  return {
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare: equityValue / outstandingShares,
    marginOfSafety,
    assumptions: {
      baseFcff: baseProjection.baseFcff,
      baseGrowth,
      terminalGrowth,
      wacc,
      rawWacc,
      costOfEquity,
      afterTaxCostOfDebt,
      leveredBeta,
      taxRate,
      projectionYears,
    },
    diagnostics: {
      pvExplicitFcff,
      pvTerminalValue,
      terminalValueWeight,
      consensusYears,
      quality: classifyQuality({
        baseGrowth,
        terminalValueWeight,
        negativeEquity,
        terminalGrowth,
        wacc,
      }),
      waccClamped: rawWacc !== wacc,
      deltaNwcUnavailable: deltaNwc.unavailable,
      negativeEquity,
    },
    projections,
  }
}

function buildProjections(input: {
  baseEbit: number | null
  baseFcff: number
  baseGrowth: number
  baseDepreciationAndAmortization: number
  baseCapitalExpenditure: number
  baseDeltaNwc: number
  projectionYears: number
  terminalGrowth: number
  taxRate: number
  wacc: number
  consensusEbitEstimates?: EbitConsensusEstimate[]
}): DcfResult['projections'] {
  if (input.baseEbit === null) {
    let projectedFcff = input.baseFcff

    return Array.from({ length: input.projectionYears }, (_, index) => {
      const year = index + 1
      const growth = interpolateGrowth({
        baseGrowth: input.baseGrowth,
        projectionYears: input.projectionYears,
        terminalGrowth: input.terminalGrowth,
        year,
      })

      projectedFcff *= (1 + growth)

      return {
        year,
        ebit: null,
        growth,
        fcff: projectedFcff,
        presentValue: projectedFcff / Math.pow(1 + input.wacc, year),
        source: 'model',
      }
    })
  }

  const projectedEbitSeries = computeProjectedEbitSeries(
    input.baseEbit,
    input.baseGrowth,
    input.terminalGrowth,
    input.projectionYears,
    input.consensusEbitEstimates,
  )
  let projectedDepreciationAndAmortization = input.baseDepreciationAndAmortization
  let projectedCapitalExpenditure = input.baseCapitalExpenditure
  let projectedDeltaNwc = input.baseDeltaNwc

  return projectedEbitSeries.map(item => {
    projectedDepreciationAndAmortization *= (1 + item.growth)
    projectedCapitalExpenditure *= (1 + item.growth)
    projectedDeltaNwc *= (1 + item.growth)

    const fcff = computeProjectedFcffFromEbit(
      item.ebit,
      input.taxRate,
      projectedDepreciationAndAmortization,
      projectedCapitalExpenditure,
      projectedDeltaNwc,
    )

    return {
      year: item.year,
      ebit: item.ebit,
      growth: item.growth,
      fcff,
      presentValue: fcff / Math.pow(1 + input.wacc, item.year),
      source: item.source,
    }
  })
}

function classifyQuality(input: {
  baseGrowth: number
  terminalValueWeight: number
  negativeEquity: boolean
  terminalGrowth: number
  wacc: number
}): DcfQuality {
  if (input.negativeEquity) {
    return 'invalid'
  }

  if ((input.wacc - input.terminalGrowth) <= THIN_WACC_SPREAD_THRESHOLD) {
    return 'low_confidence_thin_wacc_spread'
  }

  if (input.terminalValueWeight >= TERMINAL_VALUE_DOMINANT_THRESHOLD) {
    return 'low_confidence_terminal_value_dominant'
  }

  if (input.baseGrowth > 0.08) {
    return 'medium_confidence_high_growth'
  }

  return 'reasonable'
}

function computeBaseFcff(
  lineItem: FinancialLineItem,
  taxRate: number,
  deltaNwc: number,
): { baseEbit: number | null; baseFcff: number | null } {
  const ebit = toFiniteNumber(lineItem.ebit)
  const depreciationAndAmortization = toFiniteNumber(lineItem.depreciationAndAmortization)
  const capitalExpenditure = toFiniteNumber(lineItem.capitalExpenditure)

  if (ebit !== null && depreciationAndAmortization !== null && capitalExpenditure !== null) {
    return {
      baseEbit: ebit,
      baseFcff: computeProjectedFcffFromEbit(
        ebit,
        taxRate,
        depreciationAndAmortization,
        Math.abs(capitalExpenditure),
        deltaNwc,
      ),
    }
  }

  return {
    baseEbit: null,
    baseFcff: toFiniteNumber(lineItem.freeCashFlow),
  }
}

export function computeProjectedEbitSeries(
  baseEbit: number,
  fallbackBaseGrowth: number,
  terminalGrowth: number,
  projectionYears: number,
  consensusEbitEstimates?: EbitConsensusEstimate[],
): ProjectedEbitPoint[] {
  let previousEbit = baseEbit

  return Array.from({ length: projectionYears }, (_, index) => {
    const year = index + 1
    const consensusEstimate = consensusEbitEstimates?.find(item => item.year === year)
    const growth = consensusEstimate === undefined
      ? interpolateGrowth({
        baseGrowth: fallbackBaseGrowth,
        projectionYears,
        terminalGrowth,
        year,
      })
      : previousEbit === 0
        ? 0
        : (consensusEstimate.ebit / previousEbit) - 1
    const ebit = consensusEstimate?.ebit ?? previousEbit * (1 + growth)
    const source = consensusEstimate === undefined ? 'model' : 'consensus'

    previousEbit = ebit

    return {
      year,
      ebit,
      growth,
      source,
    }
  })
}

export function computeProjectedFcffFromEbit(
  ebit: number,
  taxRate: number,
  dna: number,
  capex: number,
  deltaNwc: number,
): number {
  const nopat = ebit * (1 - taxRate)
  return nopat + dna - capex - deltaNwc
}

function computeBaseGrowth(metrics: FinancialMetric[], lineItems: FinancialLineItem[]): number {
  const metricRevenueSeries = metrics.map(metric => toFiniteNumber(metric.revenue))
  const lineItemRevenueSeries = lineItems.map(item => toFiniteNumber(item.revenue))
  const revenueCagr = computeCagr(metricRevenueSeries) ?? computeCagr(lineItemRevenueSeries)

  return clamp(revenueCagr ?? DEFAULT_BASE_GROWTH, MIN_BASE_GROWTH, MAX_BASE_GROWTH)
}

function computeCagr(series: Array<number | null>): number | null {
  const values = series.filter((value): value is number => value !== null && value > 0)

  if (values.length < 2) {
    return null
  }

  const latest = values[0]
  const oldest = values[values.length - 1]
  const years = values.length - 1

  return Math.pow(latest / oldest, 1 / years) - 1
}

function computeDeltaNwc(lineItems: FinancialLineItem[]): { value: number; unavailable: boolean } {
  if (lineItems.length < 2) {
    return { value: 0, unavailable: true }
  }

  const latestNwc = extractNetWorkingCapital(lineItems[0])
  const previousNwc = extractNetWorkingCapital(lineItems[1])

  if (latestNwc === null || previousNwc === null) {
    return { value: 0, unavailable: true }
  }

  return {
    value: latestNwc - previousNwc,
    unavailable: false,
  }
}

function computeLeveredBeta(input: {
  companyBeta?: number
  industryUnleveredBeta?: number
  marketCap: number
  taxRate: number
  totalDebt: number
}): number {
  const companyBeta = toFiniteNumber(input.companyBeta)

  if (companyBeta !== null) {
    return companyBeta
  }

  const industryUnleveredBeta = toFiniteNumber(input.industryUnleveredBeta)
  if (industryUnleveredBeta === null || input.marketCap <= 0) {
    return 1
  }

  return industryUnleveredBeta * (1 + (1 - input.taxRate) * (input.totalDebt / input.marketCap))
}

function computePreTaxCostOfDebt(interestExpense: NullableNumber, totalDebt: number): number {
  const parsedInterestExpense = toFiniteNumber(interestExpense)

  if (parsedInterestExpense === null || totalDebt <= 0) {
    return DEFAULT_COST_OF_DEBT
  }

  return Math.abs(parsedInterestExpense) / totalDebt
}

function extractNetWorkingCapital(lineItem: FinancialLineItem): number | null {
  const workingCapital = toFiniteNumber(lineItem.workingCapital)
  if (workingCapital !== null) {
    return workingCapital
  }

  const currentAssets = toFiniteNumber(lineItem.currentAssets)
  const currentLiabilities = toFiniteNumber(lineItem.currentLiabilities)

  if (currentAssets === null || currentLiabilities === null) {
    return null
  }

  return currentAssets - currentLiabilities
}

function interpolateGrowth(input: {
  baseGrowth: number
  projectionYears: number
  terminalGrowth: number
  year: number
}): number {
  if (input.projectionYears === 1) {
    return input.terminalGrowth
  }

  const progress = (input.year - 1) / (input.projectionYears - 1)
  return input.baseGrowth + (input.terminalGrowth - input.baseGrowth) * progress
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function toFiniteNumber(value: NullableNumber): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
