'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { SignalCard } from '@/components/SignalCard'
import { listSignalTargets, loadTradingSignals } from '@/lib/tradingSignalsClient'
import { SESSION_KEYS, type PortfolioPosition } from '@/lib/types'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supportedCount = useMemo(() => listSignalTargets(positions).length, [positions])
  const sectorByTarget = useMemo(() => {
    const entries = new Map<string, string>()

    for (const position of positions) {
      if (
        (position.assetClass !== '국내주식' && position.assetClass !== '해외주식')
        || !position.code
        || !position.sector
      ) {
        continue
      }

      const normalizedTicker = position.assetClass === '국내주식'
        ? position.code.trim()
        : position.code.trim().toUpperCase()
      const market = position.assetClass === '국내주식' ? 'KR' : 'US'
      const key = `${market}:${normalizedTicker}`

      if (!entries.has(key)) {
        entries.set(key, position.sector)
      }
    }

    return entries
  }, [positions])
  const groupedSummaryItems = useMemo(() => {
    const accumulateCount = signals.filter(signal => signal.score >= 70).length
    const watchCount = signals.filter(signal => signal.score >= 50 && signal.score < 70).length
    const cautionCount = signals.filter(signal => signal.score >= 30 && signal.score < 50).length

    return [
      { color: 'var(--green)', count: accumulateCount, label: '분할매수\n고려' },
      { color: 'var(--amber)', count: watchCount, label: '관심\n종목' },
      { color: '#9ca3af', count: cautionCount, label: '관망 우세' },
    ]
  }, [signals])
  const unsupportedCount = Math.max(
    positions.filter(position => position.assetClass === '국내주식' || position.assetClass === '해외주식').length - supportedCount,
    0,
  )

  async function handleRefresh() {
    setLoading(true)
    setError(null)

    try {
      setSignals(await loadTradingSignals(positions))
    } catch {
      setError('종목 시그널을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
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
        <div className={styles.eyebrow}>Stock Analysis</div>
        <h1 className={styles.title}>종목 분석</h1>
        <p className={styles.sub}>
          RSI · MACD · 거래량 · 52주 위치, 4가지 지표로 종목 점수를 산출합니다.
        </p>
      </div>

      <div className={styles.body}>
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

        {!loading && !error && signals.length > 0 && (
          <section className={styles.summaryCard} aria-labelledby="signals-summary-title">
            <div className={styles.summaryHeader}>
              <div>
                <h2 id="signals-summary-title" className={styles.summaryTitle}>보유 종목 상태 요약</h2>
              </div>
            </div>

            <div className={styles.summaryTiles}>
              {groupedSummaryItems.map(item => (
                <div key={item.label} className={styles.summaryTile} style={{ background: `${item.color}12` }}>
                  <div className={styles.summaryTileValue} style={{ color: item.color }}>{item.count}</div>
                  <div className={styles.summaryTileLabel} style={{ color: item.color }}>{item.label}</div>
                </div>
              ))}
            </div>

            <p className={styles.summaryLegend}>
              점수 기준: 70+ 분할매수 고려 · 50~69 관심 종목 · 30~49 관망 우세 · ~29 주의 필요
            </p>
            <div className={styles.metaRow}>
              <span className={styles.metaBadge}>분석 가능 {supportedCount}종목</span>
              {unsupportedCount > 0 && <span className={styles.metaHint}>코드 없는 {unsupportedCount}종목은 제외됐어요.</span>}
            </div>
          </section>
        )}

        <div className={styles.cardList}>
          {signals.map(signal => (
            <SignalCard
              key={`${signal.market}:${signal.ticker}`}
              sector={sectorByTarget.get(`${signal.market}:${signal.ticker}`)}
              signal={signal}
            />
          ))}
        </div>

        {!loading && !error && signals.length > 0 && (
          <div className={styles.actions}>
            <button className={styles.secondaryButton} onClick={() => router.push('/diagnosis')}>
              진단으로 돌아가기
            </button>
            <button className={styles.primaryButton} onClick={() => void handleRefresh()}>
              최신 신호 다시 보기
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
