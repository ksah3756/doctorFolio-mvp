'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { MarketCard } from '@/components/MarketCard'
import { buildMarketInsight } from '@/lib/marketInsightTemplates'
import type { MarketResponse } from '@/lib/marketSignals'
import { loadMarketSignals } from '@/lib/marketSignalsClient'
import styles from './page.module.css'

const SKELETON_COUNT = 5
const INDICATOR_ORDER = ['fearGreed', 'yieldCurve', 'erp', 'creditSpread', 'm2'] as const

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
  const insight = market && entry && health
    ? buildMarketInsight(entry.score, health.score)
    : null
  const orderedIndicators = market
    ? [...market.indicators].sort(
      (left, right) => INDICATOR_ORDER.indexOf(left.key) - INDICATOR_ORDER.indexOf(right.key),
    )
    : []

  return (
    <div className={styles.wrap}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>Market Context</div>
          <h1 className={styles.title}>시장 분위기</h1>
          <p className={styles.description}>
            지금 투자하기 좋은 환경인지 5가지 신호로 알아봐요.
          </p>
        </header>

        <main className={styles.content}>
          {loading && (
            <section className={styles.heroCard} aria-hidden="true">
              <div className={styles.skeletonKpiEyebrow} />
              <div className={styles.skeletonKpiRow}>
                <div className={styles.skeletonKpiScore} />
                <div className={styles.skeletonKpiLabel} />
              </div>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonHealthChip} />
            </section>
          )}

          {error && !market && (
            <div className={styles.stateCard}>
              <p>{error}</p>
              <button className={styles.inlineRetry} onClick={() => void handleRefresh()}>
                다시 시도
              </button>
            </div>
          )}

          {!loading && market && entry && health && (
            <section className={styles.heroCard}>
              <div className={styles.entryBlock}>
                <div className={styles.kpiEyebrow}>진입 매력도</div>
                <div className={styles.kpiRow}>
                  <div className={styles.kpiScore}>
                    <span className={styles.kpiScoreNum}>{entry.score}</span>
                    <span className={styles.kpiScoreUnit}>/100</span>
                  </div>
                  <div className={styles.kpiLabel}>{entry.label}</div>
                </div>
                <p className={styles.kpiSummary}>{entry.summary}</p>
              </div>

              <div className={styles.healthChip}>
                <span className={styles.healthEyebrow}>시장 건강도</span>
                <span className={styles.healthLabel}>{health.label}</span>
                <span className={styles.healthScore}>{health.score}/100</span>
              </div>

              {insight && (
                <div className={styles.implication}>
                  <div className={styles.implicationLabel}>{insight.title}</div>
                  <p className={styles.implicationText}>{insight.message}</p>
                </div>
              )}
            </section>
          )}

          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>5가지 신호 상세</div>
            {!loading && (
              <button className={styles.refreshButton} onClick={() => void handleRefresh()}>
                새로고침
              </button>
            )}
          </div>

          {loading && (
            <div className={styles.cardList}>
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <div key={index} className={styles.skeletonCard} aria-hidden="true">
                  <div className={styles.skeletonRow}>
                    <div className={styles.skeletonIcon} />
                    <div className={styles.skeletonText}>
                      <div className={styles.skeletonTitleShort} />
                      <div className={styles.skeletonLine} />
                    </div>
                    <div className={styles.skeletonBadge} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && market && (
            <>
              <div className={styles.cardList}>
                {orderedIndicators.map(indicator => (
                  <MarketCard key={indicator.key} indicator={indicator} />
                ))}
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaBadge}>지표 {market.indicators.length}개</span>
                <span className={styles.metaBadge}>
                  기준 시각 {new Date(market.fetchedAt).toLocaleString('ko-KR')}
                </span>
              </div>

              <p className={styles.source}>데이터 출처: FRED, onoff.markets, multpl.com</p>
            </>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
