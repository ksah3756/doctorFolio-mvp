// src/components/ConfirmCard.tsx
'use client'
import { useState } from 'react'
import type { PortfolioPosition, AssetClass } from '@/lib/types'
import styles from './ConfirmCard.module.css'

interface Props {
  position: PortfolioPosition
  pct: number               // 전체 포트폴리오 중 비중 (%)
  isDuplicate: boolean
  onDelete: (id: string) => void
  onAssetClassChange: (id: string, assetClass: AssetClass) => void
}

const ASSET_CLASSES: AssetClass[] = ['국내주식', '해외주식', '채권', '기타']

export function ConfirmCard({ position, pct, isDuplicate, onDelete, onAssetClassChange }: Props) {
  const [expanded, setExpanded] = useState(false)

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')

  return (
    <div className={styles.card}>
      <div className={styles.main}>
        {/* Row 1: 종목명 + 중복 배지 + 삭제 */}
        <div className={styles.row1}>
          <div className={styles.nameWrap}>
            <span className={styles.name}>{position.name}</span>
            {isDuplicate && (
              <span className={styles.dupBadge} aria-label="같은 종목이 여러 줄 있습니다">
                ⚠ 중복
              </span>
            )}
          </div>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(position.id)}
            aria-label={`${position.name} 삭제`}
          >
            ✕
          </button>
        </div>

        {/* 2×2 데이터 그리드 */}
        <div className={styles.grid}>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>보유금액</div>
            <div className={styles.cellVal}>{fmt(position.value)}</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>비중</div>
            <div className={styles.cellVal}>{pct.toFixed(1)}%</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>평균단가</div>
            <div className={`${styles.cellVal} ${styles.secondary}`}>{fmt(position.avgCost)}</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>현재가</div>
            <div className={`${styles.cellVal} ${styles.secondary}`}>{fmt(position.currentPrice)}</div>
          </div>
        </div>

        {/* 자산군 드롭다운 + 섹터 */}
        <div className={styles.meta}>
          <select
            className={styles.select}
            value={position.assetClass}
            onChange={e => onAssetClassChange(position.id, e.target.value as AssetClass)}
            aria-label="자산군 선택"
          >
            {ASSET_CLASSES.map(ac => (
              <option key={ac} value={ac}>{ac}</option>
            ))}
          </select>
          <div className={styles.sector}>{position.sector}</div>
        </div>
      </div>

      {/* 상세보기 토글 */}
      <button
        className={styles.toggle}
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        상세보기 <span className={expanded ? styles.arrowUp : styles.arrowDown}>▾</span>
      </button>

      {expanded && (
        <div className={styles.expand}>
          <div className={styles.expandRow}>
            <span className={styles.expandLabel}>수량</span>
            <span className={styles.expandVal}>{position.qty}주</span>
          </div>
          <div className={styles.expandRow}>
            <span className={styles.expandLabel}>출처</span>
            <span className={styles.expandVal}>이미지 {position.sourceImage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
