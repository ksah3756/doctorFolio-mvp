import type { CSSProperties } from 'react'
import type { SectorAllocationSlice } from '@/lib/sectorAllocation'
import styles from './SectorPieChart.module.css'

const SLICE_COLORS = ['#1A237E', '#3949AB', '#059669', '#D97706', '#E11D48']

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
  const totalValue = slices.reduce((sum, slice) => sum + slice.value, 0)
  const chartFill = slices
    .map((slice, index) => {
      const startValue = slices
        .slice(0, index)
        .reduce((sum, current) => sum + current.value, 0)
      const start = (startValue / totalValue) * 100
      const end = ((startValue + slice.value) / totalValue) * 100
      const color = SLICE_COLORS[index % SLICE_COLORS.length]

      return `${color} ${start}% ${end}%`
    })
    .join(', ')

  const leadSlice = slices[0]

  return (
    <section className={styles.card} aria-labelledby="sector-allocation-title">
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Sector Mix</div>
          <h2 id="sector-allocation-title" className={styles.title}>섹터 비중</h2>
          <p className={styles.caption}>확정한 종목의 평가금액 기준으로 섹터 분산 상태를 한눈에 봅니다.</p>
        </div>
        <div className={styles.topSector}>최대 {leadSlice.sector}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.chartWrap}>
          <div
            className={styles.chart}
            style={{ '--chart-fill': chartFill } as CSSProperties}
            role="img"
            aria-label={slices.map(slice => `${slice.sector} ${formatShare(slice.share)}`).join(', ')}
          >
            <div className={styles.chartCenter}>
              <div>
                <div className={styles.centerLabel}>Top Sector</div>
                <div className={styles.centerValue}>{formatShare(leadSlice.share)}</div>
                <div className={styles.centerDesc}>{leadSlice.sector}</div>
              </div>
            </div>
          </div>
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
