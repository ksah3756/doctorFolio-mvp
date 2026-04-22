'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MarketCard } from '@/components/MarketCard'
import { formatMacroStateLabel, type MarketResponse } from '@/lib/marketSignals'
import { loadMarketSignals } from '@/lib/marketSignalsClient'
import styles from './page.module.css'

const SKELETON_COUNT = 5

export default function MarketPage() {
  const [market, setMarket] = useState<MarketResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function hydrateMarket() {
      try {
        const nextMarket = await loadMarketSignals()
        if (active) setMarket(nextMarket)
      } catch {
        if (active) setError('시장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void hydrateMarket()

    return () => {
      active = false
    }
  }, [])

  async function handleRefresh() {
    setLoading(true)
    setError(null)

    try {
      setMarket(await loadMarketSignals(true))
    } catch {
      setError('시장 데이터를 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Macro Market Engine</div>
        <h1 className={styles.title}>오늘 시장 바람이 주식에 우호적인지 한 화면에서 확인해보세요.</h1>
        <p className={styles.sub}>
          장단기 금리차, 하이일드 스프레드, M2, Fear&amp;Greed, ERP를 묶어 Risk-On / 중립 / Risk-Off로 정리했어요.
        </p>

        <div className={styles.heroCard}>
          <div>
            <div className={styles.heroLabel}>시장 상태</div>
            <div className={styles.heroValue}>
              {loading ? '정리 중…' : formatMacroStateLabel(market?.macroState ?? 'neutral')}
            </div>
            <p className={styles.heroSummary}>
              {error ?? market?.headline ?? '외부 시장 데이터를 불러오는 중입니다.'}
            </p>
          </div>
          <div className={styles.heroMeta}>
            <span className={`${styles.badge} ${styles[`badge_${market?.macroState ?? 'neutral'}`]}`}>
              점수 {loading ? '...' : market?.macroScore ?? 0}
            </span>
            <button className={styles.refreshButton} onClick={() => void handleRefresh()}>
              최신 시장 다시 보기
            </button>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.actions}>
          <Link className={styles.secondaryLink} href="/signals">
            ← 종목 시그널로 돌아가기
          </Link>
        </div>

        {loading && (
          <div className={styles.cardGrid}>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div key={index} className={styles.skeletonCard} aria-hidden="true">
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonValue} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            ))}
          </div>
        )}

        {error && !market && (
          <div className={styles.stateCard}>
            <p>{error}</p>
            <button className={styles.inlineRetry} onClick={() => void handleRefresh()}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && market && (
          <>
            <div className={styles.metaRow}>
              <span className={styles.metaBadge}>지표 {market.indicators.length}개</span>
              <span className={styles.metaBadge}>
                기준 시각 {new Date(market.fetchedAt).toLocaleString('ko-KR')}
              </span>
            </div>

            <div className={styles.cardGrid}>
              {market.indicators.map(indicator => (
                <MarketCard key={indicator.key} indicator={indicator} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
