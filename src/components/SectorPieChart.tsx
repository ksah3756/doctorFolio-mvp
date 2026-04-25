import type { CSSProperties } from 'react'
import type { SectorAllocationSlice } from '@/lib/sectorAllocation'
import styles from './SectorPieChart.module.css'

const SLICE_COLORS = ['#1C2B5E', '#E8A838', '#23B26D', '#E24D4D', '#9B8FD4']

function formatAmount(value: number): string {
  return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만원`
}

function formatShare(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

interface SectorPieChartProps {
  slices: SectorAllocationSlice[]
}

export function SectorPieChart({ slices }: SectorPieChartProps) {
  if (slices.length === 0) {
    return null
  }

  const leadSlice = slices[0]
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const segments = slices.map((slice, index) => {
    const cumulativeShare = slices
      .slice(0, index)
      .reduce((sum, current) => sum + current.share, 0)

    return {
      ...slice,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
      dashLength: (slice.share / 100) * circumference,
      dashOffset: circumference - (cumulativeShare / 100) * circumference,
    }
  })

  return (
    <section className={styles.card} aria-labelledby="sector-allocation-title">
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Sector Mix</div>
          <h2 id="sector-allocation-title" className={styles.title}>섹터 비중</h2>
          <p className={styles.caption}>평가금액 기준으로 섹터 분산 상태를 한눈에 봅니다.</p>
        </div>
        <div className={styles.topSector}>최대 {leadSlice.sector}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.chartWrap}>
          <svg
            width="118"
            height="118"
            viewBox="0 0 120 120"
            className={styles.chart}
            role="img"
            aria-label={slices.map(slice => `${slice.sector} ${formatShare(slice.share)}`).join(', ')}
          >
            {segments.map(slice => {
              return (
                <circle
                  key={slice.sector}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="16"
                  strokeDasharray={`${slice.dashLength} ${circumference - slice.dashLength}`}
                  strokeDashoffset={slice.dashOffset}
                  transform="rotate(-90 60 60)"
                />
              )
            })}
            <circle cx="60" cy="60" r="33" fill="white" />
            <text
              x="60"
              y="53"
              textAnchor="middle"
              className={styles.chartValue}
            >
              {formatShare(leadSlice.share)}
            </text>
            <text
              x="60"
              y="68"
              textAnchor="middle"
              className={styles.chartLabel}
            >
              {leadSlice.sector}
            </text>
          </svg>
        </div>

        <div className={styles.legend}>
          {slices.map((slice, index) => {
            const color = SLICE_COLORS[index % SLICE_COLORS.length]

            return (
              <div key={slice.sector} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ '--slice-color': color } as CSSProperties}
                  aria-hidden="true"
                />
                <span className={styles.legendLabel}>{slice.sector}</span>
                <span className={styles.legendMeta}>
                  <span className={styles.legendShare}>{formatShare(slice.share)}</span>
                  <span className={styles.legendValue}>{formatAmount(slice.value)}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
