// src/components/AllocationBar.tsx
import type { AllocationBucket, TargetAllocation } from '@/lib/types'
import styles from './AllocationBar.module.css'

interface Props {
  current: Record<AllocationBucket, number>
  target: TargetAllocation
}

const ROWS: { key: keyof TargetAllocation; label: string; currentKeys: AllocationBucket[] }[] = [
  { key: '국내주식', label: '국내주식', currentKeys: ['국내주식'] },
  { key: '해외주식', label: '해외주식', currentKeys: ['해외주식'] },
  { key: '채권', label: '채권·기타', currentKeys: ['채권', '기타', '현금'] },
]

export function AllocationBar({ current, target }: Props) {
  return (
    <div className={styles.wrap}>
      {ROWS.map(({ key, label, currentKeys }) => {
        const cur = currentKeys.reduce((sum, assetClass) => sum + (current[assetClass] ?? 0), 0)
        const tgt = key === '채권'
          ? (target['채권'] ?? 0) + (target['현금'] ?? 0)
          : (target[key] ?? 0)
        const isOver = cur > tgt + 5
        const isUnder = cur < tgt - 5
        const fillColor = isOver ? 'var(--amber)' : isUnder ? 'var(--green)' : 'var(--green)'

        return (
          <div key={key} className={styles.row}>
            <div className={styles.rowHeader}>
              <span className={styles.label}>{label}</span>
              <div className={styles.meta}>
                <span className={styles.pct}>{cur}%</span>
                <span className={`${styles.targetLabel} ${isOver ? styles.targetOver : ''}`}>
                  목표 {tgt}%
                </span>
              </div>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${Math.min(cur, 100)}%`, background: fillColor }}
              />
              <div className={styles.targetLine} style={{ left: `${tgt}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
