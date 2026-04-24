'use client'
// src/components/ActionItem.tsx
import { useState } from 'react'
import type { Action } from '@/lib/types'
import styles from './ActionItem.module.css'

interface Props { action: Action }

function getWhyText(action: Action): string {
  if (action.action === 'sell') {
    return `${action.name} 비중이 높아 포트폴리오 집중도를 낮추기 위한 조치입니다. 매도 후 다른 자산군으로 분산하면 변동성을 줄이는 데 도움이 됩니다.`
  }
  return `목표 비중 대비 ${action.name} 비중이 부족합니다. 분할 매수로 천천히 목표 비중에 맞추는 방법을 권장합니다.`
}

export function ActionItem({ action }: Props) {
  const [whyOpen, setWhyOpen] = useState(false)
  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
  const isSell = action.action === 'sell'
  const avatar = action.name.charAt(0)

  return (
    <div className={styles.item}>
      <div className={styles.top}>
        <div className={styles.stockRow}>
          <div className={`${styles.avatar} ${isSell ? styles.avatarSell : styles.avatarBuy}`}>
            {avatar}
          </div>
          <div className={styles.stockInfo}>
            <div className={styles.name}>{action.name}</div>
            <div className={styles.ticker}>{action.ticker}</div>
          </div>
          <div className={`${styles.actionBadge} ${isSell ? styles.sell : styles.buy}`}>
            {isSell ? '매도' : '매수'} {action.quantity}주
          </div>
        </div>

        <div className={styles.amountBox}>
          <div className={styles.amountItem}>
            <span className={styles.amountLabel}>{isSell ? '매도 금액' : '매수 금액'}</span>
            <span className={`${styles.amountValue} ${isSell ? styles.amountSell : styles.amountBuy}`}>
              약 {fmt(action.estimatedAmount)}원
            </span>
          </div>
          {action.taxEstimate !== undefined && (
            <div className={styles.amountItem}>
              <span className={styles.amountLabel}>예상 세금</span>
              <span className={styles.amountValueNeutral}>₩{fmt(action.taxEstimate)}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.whySection}>
        <button
          type="button"
          className={styles.whyToggle}
          onClick={() => setWhyOpen(o => !o)}
        >
          <span>왜 이 조치인가요?</span>
          <span className={`${styles.whyArrow} ${whyOpen ? styles.whyArrowOpen : ''}`}>▾</span>
        </button>
        {whyOpen && (
          <p className={styles.whyText}>{getWhyText(action)}</p>
        )}
      </div>
    </div>
  )
}
