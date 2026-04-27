import type {
  DcfInput,
  EbitConsensusEstimate,
  FinancialLineItem,
  FinancialMetric,
} from '@/lib/dcfValuation'

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

interface FmpAnalystEstimate {
  date?: string | null
  ebitAvg?: number | null
  estimatedEbitAvg?: number | null
}

export interface FmpDcfSnapshot {
  companyBeta?: number
  lineItems: FinancialLineItem[]
  marketCap: number
  metrics: FinancialMetric[]
  sector?: string
}

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'
const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable'
const FMP_STATEMENT_LIMIT = 4

export async function fetchAnalystEbitEstimates(ticker: string): Promise<EbitConsensusEstimate[]> {
  try {
    const apiKey = process.env.FMP_API_KEY?.trim()

    if (!apiKey) {
      throw new Error('FMP_API_KEY is not configured')
    }

    const normalizedTicker = ticker.toUpperCase()
    const encodedTicker = encodeURIComponent(normalizedTicker)
    const estimates = await fetchFmpStableJson<FmpAnalystEstimate[]>(
      `analyst-estimates?symbol=${encodedTicker}&period=annual&page=0&limit=10&apikey=${apiKey}`,
    )
    const today = new Date()
    const yearOneMaxDate = new Date(today)
    yearOneMaxDate.setFullYear(today.getFullYear() + 1)
    const maxDate = new Date(today)
    maxDate.setFullYear(today.getFullYear() + 2)

    if (estimates.length > 0) {
      const sample = estimates[0]

      console.info('FMP analyst-estimates response shape', {
        ticker: encodedTicker,
        keys: sample ? Object.keys(sample) : [],
      })
    }

    if (!estimates.some(estimate => getAnalystEstimateEbit(estimate) !== undefined)) {
      console.warn(`FMP analyst-estimates missing EBIT consensus field for ${normalizedTicker}`)
      return []
    }

    const result = new Map<number, EbitConsensusEstimate>()
    const sortedEstimates = [...estimates].sort((left, right) => {
      const leftTime = Date.parse(left.date ?? '')
      const rightTime = Date.parse(right.date ?? '')

      return leftTime - rightTime
    })

    for (const estimate of sortedEstimates) {
      const date = estimate.date ? new Date(estimate.date) : null
      if (date === null || Number.isNaN(date.getTime()) || date <= today || date > maxDate) {
        continue
      }

      const ebit = getAnalystEstimateEbit(estimate)
      if (ebit === undefined || ebit <= 0) {
        continue
      }

      const year = date <= yearOneMaxDate ? 1 : 2
      if (!result.has(year)) {
        result.set(year, { year, ebit })
      }
    }

    return [1, 2]
      .map(year => result.get(year))
      .filter((estimate): estimate is EbitConsensusEstimate => estimate !== undefined)
  } catch (error) {
    console.error(`Failed to fetch analyst EBIT estimates for ${ticker.toUpperCase()}`, error)
    return []
  }
}

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
  return await fetchJson<T>(`${FMP_BASE_URL}/${path}`)
}

async function fetchFmpStableJson<T>(path: string): Promise<T> {
  return await fetchJson<T>(`${FMP_STABLE_BASE_URL}/${path}`)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 86_400 },
  })

  if (!response.ok) {
    throw new Error(`FMP request failed (${response.status}) for ${url}`)
  }

  return await response.json() as T
}

function getAnalystEstimateEbit(estimate: FmpAnalystEstimate): number | undefined {
  return toNullableNumber(estimate.estimatedEbitAvg) ?? toNullableNumber(estimate.ebitAvg)
}

function toNullableNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
