import type { DcfInput, FinancialLineItem, FinancialMetric } from '@/lib/dcfValuation'

interface FmpIncomeStatement {
  operatingIncome?: number | null
  revenue?: number | null
  interestExpense?: number | null
  weightedAverageShsOut?: number | null
}

interface FmpBalanceSheetStatement {
  netWorkingCapital?: number | null
  totalCurrentAssets?: number | null
  totalCurrentLiabilities?: number | null
  totalDebt?: number | null
  cashAndCashEquivalents?: number | null
}

interface FmpCashFlowStatement {
  depreciationAndAmortization?: number | null
  capitalExpenditure?: number | null
  freeCashFlow?: number | null
}

interface FmpProfile {
  beta?: number | null
  mktCap?: number | null
  sector?: string | null
}

export interface FmpDcfSnapshot {
  companyBeta?: number
  lineItems: FinancialLineItem[]
  marketCap: number
  metrics: FinancialMetric[]
  sector?: string
}

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'
const FMP_STATEMENT_LIMIT = 4

export async function fetchFmpDcfSnapshot(ticker: string): Promise<FmpDcfSnapshot> {
  const apiKey = process.env.FMP_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('FMP_API_KEY is not configured')
  }

  const encodedTicker = encodeURIComponent(ticker.toUpperCase())
  const [incomeStatements, balanceSheets, cashFlows, profile] = await Promise.all([
    fetchFmpJson<FmpIncomeStatement[]>(`income-statement/${encodedTicker}?limit=${FMP_STATEMENT_LIMIT}&apikey=${apiKey}`),
    fetchFmpJson<FmpBalanceSheetStatement[]>(`balance-sheet-statement/${encodedTicker}?limit=${FMP_STATEMENT_LIMIT}&apikey=${apiKey}`),
    fetchFmpJson<FmpCashFlowStatement[]>(`cash-flow-statement/${encodedTicker}?limit=${FMP_STATEMENT_LIMIT}&apikey=${apiKey}`),
    fetchFmpJson<FmpProfile[]>(`profile/${encodedTicker}?apikey=${apiKey}`),
  ])

  const maxPeriods = Math.max(incomeStatements.length, balanceSheets.length, cashFlows.length)
  const metrics: FinancialMetric[] = []
  const lineItems: FinancialLineItem[] = []

  for (let index = 0; index < maxPeriods; index += 1) {
    const income = incomeStatements[index]
    const balance = balanceSheets[index]
    const cashFlow = cashFlows[index]

    if (!income && !balance && !cashFlow) {
      continue
    }

    metrics.push({
      revenue: toNullableNumber(income?.revenue),
      ebit: toNullableNumber(income?.operatingIncome),
      freeCashFlow: toNullableNumber(cashFlow?.freeCashFlow),
    })

    lineItems.push({
      revenue: toNullableNumber(income?.revenue),
      ebit: toNullableNumber(income?.operatingIncome),
      freeCashFlow: toNullableNumber(cashFlow?.freeCashFlow),
      depreciationAndAmortization: toNullableNumber(cashFlow?.depreciationAndAmortization),
      capitalExpenditure: toNullableNumber(cashFlow?.capitalExpenditure),
      workingCapital: toNullableNumber(balance?.netWorkingCapital),
      currentAssets: toNullableNumber(balance?.totalCurrentAssets),
      currentLiabilities: toNullableNumber(balance?.totalCurrentLiabilities),
      totalDebt: toNullableNumber(balance?.totalDebt),
      interestExpense: toNullableNumber(income?.interestExpense),
      cashAndEquivalents: toNullableNumber(balance?.cashAndCashEquivalents),
      outstandingShares: toNullableNumber(income?.weightedAverageShsOut),
    })
  }

  const latestProfile = profile[0]
  const marketCap = toNullableNumber(latestProfile?.mktCap) ?? null

  if (marketCap === null || marketCap <= 0) {
    throw new Error(`FMP profile did not include a valid market cap for ${ticker.toUpperCase()}`)
  }

  return {
    companyBeta: toNullableNumber(latestProfile?.beta) ?? undefined,
    lineItems,
    marketCap,
    metrics,
    sector: typeof latestProfile?.sector === 'string' ? latestProfile.sector : undefined,
  }
}

export function toDcfInput(
  snapshot: FmpDcfSnapshot,
  damodaran: DcfInput['damodaran'],
  options?: Pick<DcfInput, 'projectionYears' | 'terminalGrowth'>,
): DcfInput {
  return {
    metrics: snapshot.metrics,
    lineItems: snapshot.lineItems,
    marketCap: snapshot.marketCap,
    damodaran,
    projectionYears: options?.projectionYears,
    terminalGrowth: options?.terminalGrowth,
  }
}

async function fetchFmpJson<T>(path: string): Promise<T> {
  const response = await fetch(`${FMP_BASE_URL}/${path}`, {
    next: { revalidate: 86_400 },
  })

  if (!response.ok) {
    throw new Error(`FMP request failed (${response.status}) for ${path}`)
  }

  return await response.json() as T
}

function toNullableNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
