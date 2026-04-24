'use client'

import { useState } from 'react'
import type {
  TradingConfidence,
  TradingRecommendation,
  TradingSignal,
  TradingSignalMetric,
} from '@/lib/tradingSignals'
import styles from './SignalCard.module.css'

interface SignalCardProps {
  sector?: string
  signal: TradingSignal
}

type ScoreStyle = {
  color: string
  label: string
  min: number
}

export const SCORE_STYLES: ScoreStyle[] = [
  { min: 70, label: '분할매수 고려', color: 'var(--green)' },
  { min: 50, label: '관심 종목', color: 'var(--amber)' },
  { min: 30, label: '관망 우세', color: '#9ca3af' },
  { min: 0, label: '주의 필요', color: 'var(--red)' },
]

const CONFIDENCE_LABEL: Record<TradingConfidence, string> = {
  high: '신뢰도 높음',
  low: '신뢰도 낮음',
  medium: '신뢰도 보통',
}

const CONFIDENCE_COLOR: Record<TradingConfidence, string> = {
  high: 'var(--green)',
  low: '#9ca3af',
  medium: 'var(--amber)',
}

const PRICE_FORMATTER = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 2,
})

export function resolveScoreStyle(score: number): ScoreStyle {
  return SCORE_STYLES.find(style => score >= style.min) ?? SCORE_STYLES[SCORE_STYLES.length - 1]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatPrice(value: number): string {
  return PRICE_FORMATTER.format(value)
}

function resolveMetricColors(signal: TradingRecommendation): { background: string; color: string } {
  if (signal === 'buy') {
    return {
      background: 'var(--green-bg)',
      color: 'var(--green)',
    }
  }

  if (signal === 'sell') {
    return {
      background: 'var(--red-bg)',
      color: 'var(--red)',
    }
  }

  return {
    background: '#f3f4f6',
    color: '#9ca3af',
  }
}

function ScoreRing({ color, score, size = 52 }: { color: string; score: number; size?: number }) {
  const strokeWidth = 5
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const dash = (clamp(score, 0, 100) / 100) * circumference

  return (
    <div className={styles.scoreRing} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f0f0f5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.scoreRingLabel} style={{ color }}>
        {score}
      </span>
    </div>
  )
}

function PriceRange52({ cur, hi, lo }: { cur: number; hi: number; lo: number }) {
  const ratio = hi > lo ? ((cur - lo) / (hi - lo)) * 100 : 50
  const pct = Math.round(clamp(ratio, 0, 100))

  return (
    <section className={styles.priceRange}>
      <div className={styles.priceRangeHeader}>
        <span className={styles.priceRangeLabel}>1년 가격 범위 내 위치</span>
        <span className={styles.priceRangeValue}>{formatPrice(cur)}</span>
      </div>
      <div className={styles.priceRangeTrack} aria-hidden="true">
        <div className={styles.priceRangeFill} style={{ width: `${pct}%` }} />
        <div className={styles.priceRangeThumb} style={{ left: `${pct}%` }} />
      </div>
      <div className={styles.priceRangeScale}>
        <span>{formatPrice(lo)}</span>
        <span>{formatPrice(hi)}</span>
      </div>
    </section>
  )
}

function ContribBar({ contribution }: { contribution: number }) {
  const abs = Math.abs(contribution)
  const width = contribution === 0 ? 0 : Math.max(8, Math.min((abs / 1.5) * 60, 60))
  const colors = resolveMetricColors(contribution > 0 ? 'buy' : contribution < 0 ? 'sell' : 'neutral')
  const text = contribution === 0 ? '±0' : `${contribution > 0 ? '+' : ''}${contribution.toFixed(2)}`

  return (
    <div className={styles.contribBar}>
      {contribution < 0 && (
        <div className={styles.contribSegment} style={{ background: colors.color, width }} />
      )}
      <span className={styles.contribValue} style={{ color: contribution === 0 ? '#9ca3af' : colors.color }}>
        {text}
      </span>
      {contribution > 0 && (
        <div className={styles.contribSegment} style={{ background: colors.color, width }} />
      )}
    </div>
  )
}

function MetricDot({ metric }: { metric: TradingSignalMetric }) {
  const colors = resolveMetricColors(metric.signal)

  return (
    <div className={styles.dotItem}>
      <span className={styles.dot} style={{ background: colors.color }} aria-hidden="true" />
      <span className={styles.dotLabel}>{metric.label}</span>
    </div>
  )
}

export function SignalCard({ sector, signal }: SignalCardProps) {
  const [open, setOpen] = useState(false)
  const [expertOpen, setExpertOpen] = useState(true)
  const scoreStyle = resolveScoreStyle(signal.score)
  const coreMetrics = signal.metrics.filter(metric => metric.includedInScore).slice(0, 4)

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
      >
        <ScoreRing color={scoreStyle.color} score={signal.score} />
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{signal.companyName}</span>
            {sector && <span className={styles.sector}>{sector}</span>}
          </div>
          <div className={styles.badgeRow}>
            <span
              className={styles.labelBadge}
              style={{
                background: `${scoreStyle.color}18`,
                color: scoreStyle.color,
              }}
            >
              {scoreStyle.label}
            </span>
            <span className={styles.confidenceDot}>·</span>
            <span className={styles.confidenceText} style={{ color: CONFIDENCE_COLOR[signal.confidence] }}>
              {CONFIDENCE_LABEL[signal.confidence]}
            </span>
          </div>
          <p className={styles.summaryClamp}>{signal.summary}</p>
        </div>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          <p className={styles.summary}>{signal.summary}</p>

          <PriceRange52 cur={signal.currentPrice} hi={signal.week52High} lo={signal.week52Low} />

          <div className={styles.dotRow}>
            {coreMetrics.map(metric => (
              <MetricDot key={metric.key} metric={metric} />
            ))}
          </div>

          <section className={styles.expertSection}>
            <button
              type="button"
              className={styles.expertToggle}
              onClick={() => setExpertOpen(current => !current)}
              aria-expanded={expertOpen}
            >
              <span>전문 지표 상세</span>
              <span className={styles.expertToggleRight}>
                <span className={styles.expertHint}>점수 기여도 포함</span>
                <span className={`${styles.expertArrow} ${expertOpen ? styles.expertArrowOpen : ''}`} aria-hidden="true">
                  ▾
                </span>
              </span>
            </button>

            {expertOpen && (
              <>
                <div className={styles.tableHeader}>
                  <span className={styles.thLabel}>지표</span>
                  <span className={styles.thStatus}>상태</span>
                  <span className={styles.thContrib}>점수 기여</span>
                </div>

                {signal.metrics.map((metric, index) => {
                  const colors = resolveMetricColors(metric.signal)

                  return (
                    <div
                      key={metric.key}
                      className={styles.metricRow}
                      style={{ borderBottom: index < signal.metrics.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                    >
                      <div className={styles.metricMain}>
                        <div className={styles.metricLeft}>
                          <span className={styles.metricLabel}>{metric.label}</span>
                          <span className={styles.metricValue}>{metric.value}</span>
                        </div>

                        <div className={styles.metricStatus}>
                          <span
                            className={styles.statusBadge}
                            style={{
                              background: colors.background,
                              color: colors.color,
                            }}
                          >
                            {metric.status}
                          </span>
                        </div>

                        <div className={styles.metricContrib}>
                          {metric.includedInScore ? <ContribBar contribution={metric.contribution} /> : <span>미반영</span>}
                        </div>
                      </div>
                      <p className={styles.metricDesc}>{metric.description}</p>
                    </div>
                  )
                })}
              </>
            )}
          </section>

          {signal.referenceMetrics.length > 0 && (
            <section className={styles.referenceSection}>
              <div className={styles.referenceTitle}>참고 지표 (점수 미반영)</div>
              {signal.referenceMetrics.map(metric => (
                <div key={metric.key} className={styles.referenceItem}>
                  <span className={styles.referenceDot} aria-hidden="true" />
                  <div className={styles.referenceBody}>
                    <div>
                      <span className={styles.referenceName}>{metric.label}</span>
                      <span className={styles.referenceValue}>{metric.value}</span>
                    </div>
                    <div className={styles.referenceNote}>{metric.summary}</div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </article>
  )
}
