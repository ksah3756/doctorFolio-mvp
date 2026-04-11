// src/components/ConfirmCard.tsx
'use client'
import { useState } from 'react'
import type { PortfolioPosition, AssetClass } from '@/lib/types'
import { SECTOR_LABELS } from '@/lib/sectors'
import styles from './ConfirmCard.module.css'

type EditableField = 'value' | 'avgCost' | 'currentPrice'

interface Props {
  position: PortfolioPosition
  pct: number               // 전체 포트폴리오 중 비중 (%)
  isDuplicate: boolean
  asRow?: boolean           // 768px+ 테이블 뷰용
  onDelete: (id: string) => void
  onAssetClassChange: (id: string, assetClass: AssetClass) => void
  onSectorChange: (id: string, sector: string) => void
  onFieldChange: (id: string, field: EditableField, value: number) => void
}

const ASSET_CLASSES: AssetClass[] = ['국내주식', '해외주식', '채권', '기타']

export function ConfirmCard({ position, pct, isDuplicate, asRow, onDelete, onAssetClassChange, onSectorChange, onFieldChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editValues, setEditValues] = useState({
    value: String(Math.round(position.value)),
    avgCost: String(Math.round(position.avgCost)),
    currentPrice: String(Math.round(position.currentPrice)),
  })
  const selectedSector = SECTOR_LABELS.some(label => label === position.sector)
    ? position.sector
    : '기타'

  function handleBlur(field: EditableField) {
    const parsed = parseInt(editValues[field].replace(/,/g, ''), 10)
    if (!isNaN(parsed) && parsed >= 0) {
      onFieldChange(position.id, field, parsed)
    } else {
      setEditValues(prev => ({ ...prev, [field]: String(Math.round(position[field])) }))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, field: EditableField) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      setEditValues(prev => ({ ...prev, [field]: String(Math.round(position[field])) }))
      e.currentTarget.blur()
    }
  }

  if (asRow) {
    return (
      <tr className={`${styles.tr} ${isDuplicate ? styles.trDup : ''}`}>
        <td className={styles.tdName}>
          <span className={styles.name}>{position.name}</span>
          {isDuplicate && <span className={styles.dupBadge} aria-label="같은 종목이 여러 줄 있습니다">⚠ 중복</span>}
        </td>
        <td className={styles.td}>
          <select className={styles.selectSm} value={position.assetClass}
            onChange={e => onAssetClassChange(position.id, e.target.value as AssetClass)}>
            {ASSET_CLASSES.map(ac => <option key={ac} value={ac}>{ac}</option>)}
          </select>
        </td>
        <td className={styles.td}>
          <select
            className={`${styles.selectSm} ${styles.sectorSelectSm}`}
            value={selectedSector}
            onChange={e => onSectorChange(position.id, e.target.value)}
            aria-label="섹터 수정"
          >
            {SECTOR_LABELS.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </td>
        <td className={styles.tdNum}>
          <input className={styles.tdInput} inputMode="numeric" value={editValues.value}
            onChange={e => setEditValues(prev => ({ ...prev, value: e.target.value }))}
            onBlur={() => handleBlur('value')} onKeyDown={e => handleKeyDown(e, 'value')}
            aria-label="보유금액 수정" />
        </td>
        <td className={`${styles.tdNum} ${styles.tdPct}`}>{pct.toFixed(1)}%</td>
        <td className={styles.tdNum}>
          <input className={`${styles.tdInput} ${styles.secondary}`} inputMode="numeric" value={editValues.avgCost}
            onChange={e => setEditValues(prev => ({ ...prev, avgCost: e.target.value }))}
            onBlur={() => handleBlur('avgCost')} onKeyDown={e => handleKeyDown(e, 'avgCost')}
            aria-label="매입가 수정" />
        </td>
        <td className={styles.tdNum}>
          <input className={`${styles.tdInput} ${styles.secondary}`} inputMode="numeric" value={editValues.currentPrice}
            onChange={e => setEditValues(prev => ({ ...prev, currentPrice: e.target.value }))}
            onBlur={() => handleBlur('currentPrice')} onKeyDown={e => handleKeyDown(e, 'currentPrice')}
            aria-label="현재가 수정" />
        </td>
        <td className={styles.tdAction}>
          <button className={styles.deleteBtn} onClick={() => onDelete(position.id)} aria-label={`${position.name} 삭제`}>✕</button>
        </td>
      </tr>
    )
  }

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
            <input
              className={styles.cellInput}
              inputMode="numeric"
              value={editValues.value}
              onChange={e => setEditValues(prev => ({ ...prev, value: e.target.value }))}
              onBlur={() => handleBlur('value')}
              onKeyDown={e => handleKeyDown(e, 'value')}
              aria-label="보유금액 수정"
            />
          </div>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>비중</div>
            <div className={styles.cellVal}>{pct.toFixed(1)}%</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>매입가</div>
            <input
              className={`${styles.cellInput} ${styles.secondary}`}
              inputMode="numeric"
              value={editValues.avgCost}
              onChange={e => setEditValues(prev => ({ ...prev, avgCost: e.target.value }))}
              onBlur={() => handleBlur('avgCost')}
              onKeyDown={e => handleKeyDown(e, 'avgCost')}
              aria-label="매입가 수정"
            />
          </div>
          <div className={styles.cell}>
            <div className={styles.cellLabel}>현재가</div>
            <input
              className={`${styles.cellInput} ${styles.secondary}`}
              inputMode="numeric"
              value={editValues.currentPrice}
              onChange={e => setEditValues(prev => ({ ...prev, currentPrice: e.target.value }))}
              onBlur={() => handleBlur('currentPrice')}
              onKeyDown={e => handleKeyDown(e, 'currentPrice')}
              aria-label="현재가 수정"
            />
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
          <select
            className={`${styles.select} ${styles.sectorSelect}`}
            value={selectedSector}
            onChange={e => onSectorChange(position.id, e.target.value)}
            aria-label="섹터 수정"
          >
            {SECTOR_LABELS.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
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
