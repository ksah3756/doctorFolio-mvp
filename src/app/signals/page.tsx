'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { resolveFinalJudgment } from '@/lib/finalJudgment'
import { loadMarketSignals } from '@/lib/marketSignalsClient'
import { SignalCard } from '@/components/SignalCard'
import { MarketBanner } from '@/components/MarketBanner'
import { listSignalTargets, loadTradingSignals } from '@/lib/tradingSignalsClient'
import { SESSION_KEYS, type PortfolioPosition } from '@/lib/types'
import type { MarketResponse } from '@/lib/marketSignals'
import type { TradingSignal } from '@/lib/tradingSignals'
import styles from './page.module.css'

function readConfirmedPositions(): PortfolioPosition[] {
  if (typeof window === 'undefined') return []

  const raw = sessionStorage.getItem(SESSION_KEYS.CONFIRMED)
  if (!raw) return []

  try {
    return JSON.parse(raw) as PortfolioPosition[]
  } catch {
    return []
  }
}

function subscribeToClientReady() {
  return () => {}
}

function getClientReadySnapshot() {
  return true
}

function getServerReadySnapshot() {
  return false
}

export default function SignalsPage() {
  const router = useRouter()
  const isClient = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  )
  const positions = useMemo(() => (isClient ? readConfirmedPositions() : []), [isClient])
  const [signals, setSignals] = useState<TradingSignal[]>([])
  const [market, setMarket] = useState<MarketResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketError, setMarketError] = useState<string | null>(null)
  const supportedCount = useMemo(() => listSignalTargets(positions).length, [positions])
  const unsupportedCount = Math.max(
    positions.filter(position => position.assetClass === '국내주식' || position.assetClass === '해외주식').length - supportedCount,
    0,
  )

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    setMarketLoading(true)
    setMarketError(null)

    try {
      setSignals(await loadTradingSignals(positions))
    } catch {
      setError('종목 시그널을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }

    try {
      setMarket(await loadMarketSignals(true))
    } catch {
      setMarketError('거시 지표를 바로 불러오지 못했어요.')
    } finally {
      setMarketLoading(false)
    }
  }

  useEffect(() => {
    if (!isClient) return
    if (positions.length === 0) {
      router.replace('/')
      return
    }
  }, [isClient, positions.length, router])

  useEffect(() => {
    if (!isClient || positions.length === 0) return

    let active = true

    async function hydrateSignals() {
      try {
        const nextSignals = await loadTradingSignals(positions)
        if (active) setSignals(nextSignals)
      } catch {
        if (active) setError('종목 시그널을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        if (active) setLoading(false)
      }

      try {
        const nextMarket = await loadMarketSignals()
        if (active) setMarket(nextMarket)
      } catch {
        if (active) setMarketError('거시 지표를 바로 불러오지 못했어요.')
      } finally {
        if (active) setMarketLoading(false)
      }
    }

    void hydrateSignals()

    return () => {
      active = false
    }
  }, [isClient, positions])

  if (!isClient) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>종목 시그널 분석</div>
        <h1 className={styles.title}>각 종목이 지금 보내는 신호를 한 번에 확인해보세요.</h1>
        <p className={styles.sub}>
          RSI, MACD, 거래량, 52주 위치, 6개월 평균, 내부자 매매를 종목 카드에 담고, 위에는 오늘 시장 온도를 따로 얹어 보여드려요.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaBadge}>분석 가능 {supportedCount}종목</span>
          {unsupportedCount > 0 && <span className={styles.metaHint}>코드 없는 {unsupportedCount}종목은 제외됐어요.</span>}
        </div>
      </div>

      <div className={styles.body}>
        <MarketBanner error={marketError} loading={marketLoading} market={market} />

        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={() => router.push('/diagnosis')}>
            ← 진단 결과로 돌아가기
          </button>
          <button className={styles.primaryButton} onClick={() => void handleRefresh()}>
            최신 신호 다시 보기
          </button>
        </div>

        {loading && <div className={styles.stateCard}>종목별 시그널을 계산하고 있습니다…</div>}

        {error && (
          <div className={styles.stateCard}>
            <p>{error}</p>
            <button className={styles.inlineRetry} onClick={() => void handleRefresh()}>
              페이지 다시 불러오기
            </button>
          </div>
        )}

        {!loading && !error && signals.length === 0 && (
          <div className={styles.stateCard}>
            현재 포트폴리오에서 시그널을 계산할 수 있는 주식 코드가 없습니다.
          </div>
        )}

        <div className={styles.cardList}>
          {signals.map(signal => (
            <SignalCard
              key={`${signal.market}:${signal.ticker}`}
              judgment={resolveFinalJudgment(market?.macroState ?? 'neutral', signal)}
              signal={signal}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
