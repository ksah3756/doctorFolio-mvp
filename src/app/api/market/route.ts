import { NextResponse } from 'next/server'
import { fetchMarketSignals } from '@/lib/marketSignals'

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'max-age=86400',
  'Vercel-CDN-Cache-Control': 'max-age=86400',
}

export async function GET() {
  try {
    const market = await fetchMarketSignals()
    return NextResponse.json(market, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('market route failed', error)
    return NextResponse.json(
      { error: '시장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502, headers: CACHE_HEADERS },
    )
  }
}
