'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MarketCard } from '@/components/MarketCard'
import type { MarketResponse } from '@/lib/marketSignals'
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

  const entry = market?.overview.entry
  const health = market?.overview.health

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Macro Market Engine</div>
        <h1 className={styles.title}>오늘 시장 바람이 주식에 우호적인지 한 화면에서 확인해보세요.</h1>

        <div className={styles.heroCard}>
          {/* 메인 KPI: 진입 매력도 */}
          <div className={styles.entryBlock}>
            <div className={styles.kpiEyebrow}>진입 매력도</div>
            <div className={styles.kpiLabel}>
              {loading ? '분석 중…' : (entry?.label ?? '중립')}
            </div>
            <div className={styles.kpiScore}>
              <span className={styles.kpiScoreNum}>
                {loading ? '--' : (entry?.score ?? 50)}
              </span>
              <span className={styles.kpiScoreUnit}>/100</span>
            </div>
            <p className={styles.kpiSummary}>
              {loading ? '' : (entry?.summary ?? '')}
            </p>
          </div>

          {/* 서브 KPI: 시장 건강도 */}
          <div className={styles.healthChip}>
            <span className={styles.healthEyebrow}>시장 건강도</span>
            <span className={styles.healthLabel}>
              {loading ? '--' : (health?.label ?? '중립')}
            </span>
            <span className={styles.healthScore}>
              {loading ? '' : `${health?.score ?? 50}/100`}
            </span>
          </div>

          {/* 투자 시사점 */}
          {!loading && entry?.guide && (
            <div className={styles.implication}>
              <span className={styles.implicationLabel}>투자 시사점</span>
              <p className={styles.implicationText}>{entry.guide}</p>
            </div>
          )}

          <div className={styles.heroMeta}>
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

            <p className={styles.source}>데이터 출처: FRED, onoff.markets, multpl.com</p>
          </>
        )}
      </div>
    </div>
  )
}
