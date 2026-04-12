import { useEffect } from 'react'
import type { AllocationBucket, TargetAllocation } from '@/lib/types'
import styles from './ImprovementSheet.module.css'

const ROWS: AllocationBucket[] = ['국내주식', '해외주식', '채권', '현금', '기타']

const LABELS: Record<AllocationBucket, string> = {
  '국내주식': '국내주식',
  '해외주식': '해외주식',
  '채권': '채권',
  '현금': '현금',
  '기타': '기타',
}

const TOLERANCE: Record<AllocationBucket, number> = {
  '국내주식': 5,
  '해외주식': 5,
  '채권': 5,
  '현금': 3,
  '기타': 3,
}

export interface ImprovementSheetProps {
  currentAllocation: Record<AllocationBucket, number>
  targetAllocation: TargetAllocation
  currentScore: number
  idealScore: number
  onClose: () => void
  open: boolean
}

export interface ImprovementRow {
  key: AllocationBucket
  label: string
  current: number
  target: number
  delta: number
  deltaLabel: string
  withinTolerance: boolean
}

function getTargetValue(targetAllocation: TargetAllocation, bucket: AllocationBucket): number {
  return bucket === '기타' ? 0 : targetAllocation[bucket]
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function getDeltaLabel(delta: number, tolerance: number): string {
  if (Math.abs(delta) <= tolerance) {
    return '—'
  }

  const direction = delta > 0 ? '▲' : '▼'
  return `${direction}${formatPercent(Math.abs(delta))}pp`
}

export function getImprovementRows(
  currentAllocation: Record<AllocationBucket, number>,
  targetAllocation: TargetAllocation,
): ImprovementRow[] {
  return ROWS.map(bucket => {
    const current = currentAllocation[bucket] ?? 0
    const target = getTargetValue(targetAllocation, bucket)
    const delta = current - target
    const tolerance = TOLERANCE[bucket]

    return {
      key: bucket,
      label: LABELS[bucket],
      current,
      target,
      delta,
      deltaLabel: getDeltaLabel(delta, tolerance),
      withinTolerance: Math.abs(delta) <= tolerance,
    }
  })
}

export function ImprovementSheet({
  currentAllocation,
  targetAllocation,
  currentScore,
  idealScore,
  onClose,
  open,
}: ImprovementSheetProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  const rows = getImprovementRows(currentAllocation, targetAllocation)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="improvement-sheet-title"
      >
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>포트폴리오 개선 보기</div>
            <h2 id="improvement-sheet-title" className={styles.title}>현재 vs 목표 비중</h2>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <section className={styles.scoreCard} aria-label="건강점수 비교">
          <div className={styles.scoreBlock}>
            <div className={styles.scoreLabel}>현재</div>
            <div className={styles.scoreValue}>{formatPercent(currentScore)}점</div>
          </div>
          <div className={styles.scoreArrow} aria-hidden="true">→</div>
          <div className={styles.scoreBlock}>
            <div className={styles.scoreLabel}>개선 시</div>
            <div className={`${styles.scoreValue} ${styles.scoreValueIdeal}`}>{formatPercent(idealScore)}점</div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>현재 포트폴리오</div>
          <div className={styles.rowList}>
            {rows.map(row => (
              <div key={row.key} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.bucketLabel}>{row.label}</span>
                  <div className={styles.rowMeta}>
                    <span className={styles.percent}>{formatPercent(row.current)}%</span>
                    <span className={row.withinTolerance ? styles.deltaNeutral : styles.deltaAlert}>
                      {row.deltaLabel}
                    </span>
                  </div>
                </div>
                <div className={styles.track} aria-hidden="true">
                  <div className={styles.trackFill} style={{ width: `${Math.min(row.current, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>목표 포트폴리오</div>
          <div className={styles.rowList}>
            {rows.map(row => (
              <div key={row.key} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.bucketLabel}>{row.label}</span>
                  <div className={styles.rowMeta}>
                    <span className={styles.percent}>{formatPercent(row.target)}%</span>
                    <span className={styles.targetCheck}>✓</span>
                  </div>
                </div>
                <div className={styles.track} aria-hidden="true">
                  <div className={`${styles.trackFill} ${styles.trackFillTarget}`} style={{ width: `${Math.min(row.target, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
