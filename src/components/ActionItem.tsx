// src/components/ActionItem.tsx
import type { Action } from '@/lib/types'
import styles from './ActionItem.module.css'

interface Props { action: Action }

export function ActionItem({ action }: Props) {
  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
  const isSell = action.action === 'sell'

  return (
    <div className={styles.item}>
      <span className={`${styles.badge} ${isSell ? styles.sell : styles.buy}`}>
        {isSell ? '매도' : '매수'}
      </span>
      <div className={styles.info}>
        <div className={styles.name}>{action.name}</div>
        {action.taxEstimate !== undefined && (
          <div className={styles.tax}>해외주식 세금 약 ₩{fmt(action.taxEstimate)} 예상</div>
        )}
      </div>
      <div className={styles.qty}>
        <div className={styles.qtyNum}>{action.quantity}주</div>
        <div className={styles.qtyAmt}>약 {fmt(action.estimatedAmount)}원</div>
      </div>
    </div>
  )
}
