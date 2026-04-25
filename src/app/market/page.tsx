'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { MarketCard } from '@/components/MarketCard'
import { deriveCycleStage, type CycleStage } from '@/lib/cycleStage'
import type { MarketResponse } from '@/lib/marketSignals'
import { loadMarketSignals } from '@/lib/marketSignalsClient'
import styles from './page.module.css'

const SKELETON_COUNT = 5
const CYCLE_STAGES = ['회복', '확장', '둔화', '침체'] as const
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

  const cycle = market ? deriveCycleStage(market) : null
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
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonLineLong} />
              <div className={styles.heroSkeletonBody}>
                <div className={styles.skeletonGauge} />
                <div className={styles.skeletonLegend}>
                  <div className={styles.skeletonLegendRow} />
                  <div className={styles.skeletonLegendRow} />
                  <div className={styles.skeletonLegendRow} />
                  <div className={styles.skeletonLegendRowShort} />
                </div>
              </div>
              <div className={styles.skeletonCallout} />
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

          {!loading && market && cycle && (
            <>
              <section className={styles.heroCard}>
                <div className={styles.sectionTitle}>경기 사이클 위치</div>
                <p className={styles.heroIntro}>{cycle.description}</p>

                <div className={styles.heroBody}>
                  <CycleGauge cycle={cycle} />

                  <div className={styles.legend}>
                    {CYCLE_STAGES.map(stage => {
                      const active = stage === cycle.label

                      return (
                        <div key={stage} className={styles.legendItem}>
                          <span
                            className={`${styles.legendDot} ${active ? styles[cycle.accentClassName] : ''}`}
                            aria-hidden="true"
                          />
                          <span className={active ? styles.legendActiveLabel : styles.legendLabel}>
                            {stage}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className={`${styles.callout} ${styles[`${cycle.accentClassName}Background`]}`}>
                  <strong className={styles.calloutLabel}>투자 시사점:</strong> {cycle.summary}
                </div>
              </section>

              <div className={styles.sectionHeader}>
                <div className={styles.sectionEyebrow}>5가지 신호 상세</div>
                <button className={styles.refreshButton} onClick={() => void handleRefresh()}>
                  새로고침
                </button>
              </div>

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

          {loading && (
            <>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionEyebrow}>5가지 신호 상세</div>
              </div>

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
            </>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

function CycleGauge({ cycle }: { cycle: CycleStage }) {
  const dashLength = 151
  const progressLength = dashLength * cycle.progress

  return (
    <svg className={styles.gauge} viewBox="0 0 116 66" aria-label={`현재 경기 사이클은 ${cycle.label}`}>
      <path
        d="M 10,58 A 48,48 0 0 1 106,58"
        fill="none"
        stroke="#f0f0f5"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 10,58 A 48,48 0 0 1 106,58"
        fill="none"
        className={styles[cycle.accentClassName]}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${progressLength} ${dashLength}`}
      />
      <circle
        cx={cycle.point.x}
        cy={cycle.point.y}
        r="6"
        className={styles[cycle.accentClassName]}
        stroke="white"
        strokeWidth="2"
      />
      <text x="58" y="52" textAnchor="middle" className={`${styles.gaugeLabel} ${styles[cycle.accentClassName]}`}>
        {cycle.label}
      </text>
      <text x="58" y="63" textAnchor="middle" className={styles.gaugeCaption}>
        {cycle.caption}
      </text>
    </svg>
  )
}
