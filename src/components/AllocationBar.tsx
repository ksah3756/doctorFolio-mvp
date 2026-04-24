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
  { key: '채권', label: '채권', currentKeys: ['채권'] },
  { key: '현금', label: '현금', currentKeys: ['현금'] },
]

export function AllocationBar({ current, target }: Props) {
  return (
    <div className={styles.wrap}>
      {ROWS.map(({ key, label, currentKeys }) => {
        const cur = currentKeys.reduce((sum, assetClass) => sum + (current[assetClass] ?? 0), 0)
        const tgt = target[key] ?? 0
        const isOver = cur > tgt + 5
        const isUnder = cur < tgt - 5
        const fillColor = isOver ? 'var(--red)' : isUnder ? 'var(--amber)' : 'var(--green)'

        return (
          <div key={key} className={styles.row}>
            <div className={styles.label}>{label}</div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${Math.min(cur, 100)}%`, background: fillColor }}
              />
              <div className={styles.targetLine} style={{ left: `${tgt}%` }} />
            </div>
            <div className={styles.pct}>{cur}%</div>
            <div className={`${styles.targetLabel} ${isOver ? styles.targetOver : ''}`}>
              목표 {tgt}%
            </div>
          </div>
        )
      })}
      <div className={styles.legend}>
        <span className={styles.legendLine} /> 세로선은 목표 비중
      </div>
    </div>
  )
}
