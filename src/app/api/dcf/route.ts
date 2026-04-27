import { NextRequest, NextResponse } from 'next/server'
import damodaranBetas from '@/data/damodaranBetas.json'
import { calculateDcfValuation } from '@/lib/dcfValuation'
import { fetchImpliedErp } from '@/lib/damodaranErp'
import { fetchAnalystEbitEstimates, fetchFmpDcfSnapshot, toDcfInput } from '@/lib/fmpAdapter'

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'max-age=86400',
  'Vercel-CDN-Cache-Control': 'max-age=86400',
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase()

  if (!ticker) {
    return NextResponse.json(
      { error: 'ticker 쿼리 파라미터가 필요합니다.' },
      { status: 400, headers: CACHE_HEADERS },
    )
  }

  if (/^\d{6}$/.test(ticker)) {
    return NextResponse.json(
      { error: 'US 주식만 지원합니다' },
      { status: 400, headers: CACHE_HEADERS },
    )
  }

  try {
    const [fmpSnapshot, equityRiskPremium, consensusEbitEstimates] = await Promise.all([
      fetchFmpDcfSnapshot(ticker),
      fetchImpliedErp(),
      fetchAnalystEbitEstimates(ticker),
    ])

    const industryUnleveredBeta = getIndustryUnleveredBeta(fmpSnapshot.sector)
    const valuation = calculateDcfValuation({
      ...toDcfInput(fmpSnapshot, {
        riskFreeRate: 0.043,
        equityRiskPremium,
        companyBeta: fmpSnapshot.companyBeta,
        industryUnleveredBeta,
        taxRate: 0.21,
      }),
      consensusEbitEstimates,
    })

    if (valuation === null) {
      return NextResponse.json(
        { unavailable: true, reason: 'DCF 계산에 필요한 재무 데이터가 부족합니다.' },
        { headers: CACHE_HEADERS },
      )
    }

    return NextResponse.json(
      {
        ...valuation,
        consensusYears: valuation.diagnostics.consensusYears,
      },
      { headers: CACHE_HEADERS },
    )
  } catch (error) {
    console.error('dcf route failed', error)

    const message = error instanceof Error ? error.message : 'DCF 데이터를 불러오지 못했습니다.'
    const status = message === 'FMP_API_KEY is not configured' ? 500 : 502

    return NextResponse.json(
      { error: message },
      { status, headers: CACHE_HEADERS },
    )
  }
}

function getIndustryUnleveredBeta(sector: string | undefined): number {
  if (sector && sector in damodaranBetas) {
    return damodaranBetas[sector as keyof typeof damodaranBetas] as number
  }

  return damodaranBetas._default
}
