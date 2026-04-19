import { NextRequest, NextResponse } from 'next/server'
import { fetchTradingSignal, type TradingMarket } from '@/lib/tradingSignals'

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'max-age=86400',
  'Vercel-CDN-Cache-Control': 'max-age=86400',
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase() ?? ''
  const marketParam = request.nextUrl.searchParams.get('market')?.trim().toUpperCase() ?? ''

  if (!ticker) {
    return NextResponse.json(
      { error: 'ticker 쿼리 파라미터가 필요합니다.' },
      { status: 400, headers: CACHE_HEADERS },
    )
  }

  if (!isTradingMarket(marketParam)) {
    return NextResponse.json(
      { error: 'market은 US 또는 KR 이어야 합니다.' },
      { status: 400, headers: CACHE_HEADERS },
    )
  }

  if ((marketParam === 'KR' && !/^\d{6}$/.test(ticker)) || (marketParam === 'US' && !/^[A-Z.-]{1,10}$/.test(ticker))) {
    return NextResponse.json(
      { error: 'ticker 형식이 market과 맞지 않습니다.' },
      { status: 400, headers: CACHE_HEADERS },
    )
  }

  try {
    const signal = await fetchTradingSignal(ticker, marketParam)
    return NextResponse.json(signal, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('signals route failed', error)
    return NextResponse.json(
      { error: '시그널 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502, headers: CACHE_HEADERS },
    )
  }
}

function isTradingMarket(value: string): value is TradingMarket {
  return value === 'US' || value === 'KR'
}
