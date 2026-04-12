'use client'
import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmCard } from '@/components/ConfirmCard'
import { SESSION_KEYS } from '@/lib/types'
import type { PortfolioPosition, AssetClass } from '@/lib/types'
import styles from './page.module.css'

const CASH_POSITION_ID = 'manual-cash-position'
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

function readStoredCash(): string {
  if (typeof window === 'undefined') return ''

  const raw = sessionStorage.getItem(SESSION_KEYS.CASH)
  return raw && /^\d+$/.test(raw) ? raw : ''
}

function parseCashAmount(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0

  return Number(digits)
}

function createCashPosition(value: number): PortfolioPosition {
  return {
    id: CASH_POSITION_ID,
    name: '현금',
    code: null,
    qty: 0,
    value,
    avgCost: 0,
    currentPrice: 0,
    assetClass: '기타',
    sector: '기타',
    sourceImage: 0,
  }
}

function readStoredPositions(): PortfolioPosition[] {
  if (typeof window === 'undefined') return []

  const raw = sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS)
  if (!raw) return []

  try {
    return JSON.parse(raw) as PortfolioPosition[]
  } catch {
    return []
  }
}

interface ConfirmPageState {
  hasStoredPositions: boolean
  loaded: boolean
  originalSectors: Record<string, string>
  positions: PortfolioPosition[]
}

type ConfirmPageAction = {
  positions: PortfolioPosition[]
  type: 'positionsChanged'
} | {
  hasStoredPositions: boolean
  positions: PortfolioPosition[]
  type: 'hydrated'
}

function confirmPageStateReducer(
  state: ConfirmPageState,
  action: ConfirmPageAction
): ConfirmPageState {
  switch (action.type) {
    case 'hydrated':
      return {
        hasStoredPositions: action.hasStoredPositions,
        loaded: true,
        originalSectors: Object.fromEntries(
          action.positions.map(position => [position.id, position.sector])
        ),
        positions: action.positions,
      }
    case 'positionsChanged':
      return {
        ...state,
        positions: action.positions,
      }
    default:
      return state
  }
}

function subscribeToDesktopViewport(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  const mq = window.matchMedia(DESKTOP_MEDIA_QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getDesktopSnapshot() {
  if (typeof window === 'undefined') return false

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}

export default function ConfirmPage() {
  const router = useRouter()
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopSnapshot,
    () => false
  )
  const [{ hasStoredPositions, loaded, originalSectors, positions }, dispatch] = useReducer(
    confirmPageStateReducer,
    {
      hasStoredPositions: true,
      loaded: false,
      originalSectors: {},
      positions: [],
    }
  )
  const [cashInput, setCashInput] = useState(() => readStoredCash())

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS)
    if (!raw) {
      dispatch({ type: 'hydrated', hasStoredPositions: false, positions: [] })
      return
    }

    dispatch({
      type: 'hydrated',
      hasStoredPositions: true,
      positions: readStoredPositions(),
    })
  }, [])

  const cashAmount = parseCashAmount(cashInput)
  const diagnosisPositions = cashAmount > 0 ? [...positions, createCashPosition(cashAmount)] : positions

  useEffect(() => {
    if (loaded && !hasStoredPositions) router.replace('/')
  }, [hasStoredPositions, loaded, router])

  const totalValue = positions.reduce((sum, position) => sum + position.value, 0)

  // 중복 티커 감지
  const nameCounts: Record<string, number> = {}
  for (const position of positions) {
    nameCounts[position.name] = (nameCounts[position.name] ?? 0) + 1
  }

  function persistCashInput(nextValue: string) {
    if (nextValue) {
      sessionStorage.setItem(SESSION_KEYS.CASH, nextValue)
      return
    }

    sessionStorage.removeItem(SESSION_KEYS.CASH)
  }

  function handleCashChange(value: string) {
    const digits = value.replace(/\D/g, '')
    setCashInput(digits)
    persistCashInput(digits)
  }

  function updatePositions(updater: (currentPositions: PortfolioPosition[]) => PortfolioPosition[]) {
    const nextPositions = updater(positions)
    dispatch({ type: 'positionsChanged', positions: nextPositions })
    return nextPositions
  }

  function handleDelete(id: string) {
    updatePositions(currentPositions => currentPositions.filter(position => position.id !== id))
  }

  function handleAssetClassChange(id: string, assetClass: AssetClass) {
    if (id === CASH_POSITION_ID) return
    updatePositions(currentPositions =>
      currentPositions.map(position => position.id === id ? { ...position, assetClass } : position)
    )
  }

  function handleSectorChange(id: string, sector: string) {
    if (id === CASH_POSITION_ID) return
    const nextSector = sector || originalSectors[id] || '기타'
    const nextPositions = updatePositions(currentPositions =>
      currentPositions.map(position => position.id === id ? { ...position, sector: nextSector } : position)
    )
    sessionStorage.setItem(SESSION_KEYS.RAW_POSITIONS, JSON.stringify(nextPositions))
  }

  function handleFieldChange(id: string, field: 'value' | 'avgCost' | 'currentPrice', value: number) {
    updatePositions(currentPositions =>
      currentPositions.map(position => position.id === id ? { ...position, [field]: value } : position)
    )
  }

  function handleStart() {
    sessionStorage.setItem(SESSION_KEYS.CONFIRMED, JSON.stringify(diagnosisPositions))
    sessionStorage.removeItem(SESSION_KEYS.DIAGNOSIS)
    router.push('/style')
  }

  if (!loaded || !hasStoredPositions) return null

  const hasDuplicates = Object.values(nameCounts).some(c => c > 1)
  const hasPositions = positions.length > 0
  const cashSection = hasPositions ? (
    <section className={styles.cashSection}>
      <label className={styles.cashInputWrap}>
        <span className={styles.cashLabel}>보유 현금 (선택)</span>
        <span className={styles.cashHint}>진단에 함께 반영할 현금이 있으면 입력하세요.</span>
        <div className={styles.cashInputRow}>
          <input
            className={styles.cashInput}
            inputMode="numeric"
            value={cashInput}
            onChange={e => handleCashChange(e.target.value)}
            placeholder="0"
            aria-label="보유 현금 (선택)"
          />
          <span className={styles.cashUnit}>원</span>
        </div>
      </label>
    </section>
  ) : null

  return (
    <div className={styles.wrap}>
      {/* 네이비 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.title}>이렇게 인식했어요</span>
          <span className={styles.count}>{positions.length}종목</span>
        </div>
        <p className={styles.hint}>자산군을 확인하고, 금액이 잘못 인식됐으면 눌러서 수정하세요.</p>
      </div>

      {isDesktop ? (
        /* 768px+ 테이블 뷰 */
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.thead}>
                  <th className={styles.th}>종목명</th>
                  <th className={styles.th}>자산군</th>
                  <th className={styles.th}>섹터</th>
                  <th className={`${styles.th} ${styles.thNum}`}>보유금액</th>
                  <th className={`${styles.th} ${styles.thNum}`}>비중</th>
                  <th className={`${styles.th} ${styles.thNum}`}>매입가</th>
                  <th className={`${styles.th} ${styles.thNum}`}>현재가</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <ConfirmCard
                    key={p.id}
                    asRow
                    position={p}
                    pct={totalValue > 0 ? Math.round((p.value / totalValue) * 1000) / 10 : 0}
                    isDuplicate={(nameCounts[p.name] ?? 0) > 1}
                    onDelete={handleDelete}
                    onAssetClassChange={handleAssetClassChange}
                    onSectorChange={handleSectorChange}
                    onFieldChange={handleFieldChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {cashSection}
        </>
      ) : (
        /* 모바일 카드 뷰 */
        <div className={styles.scroll}>
          {positions.map(p => (
            <ConfirmCard
              key={p.id}
              position={p}
              pct={totalValue > 0 ? Math.round((p.value / totalValue) * 1000) / 10 : 0}
              isDuplicate={(nameCounts[p.name] ?? 0) > 1}
              onDelete={handleDelete}
              onAssetClassChange={handleAssetClassChange}
              onSectorChange={handleSectorChange}
              onFieldChange={handleFieldChange}
            />
          ))}

          {hasDuplicates && (
            <div className={styles.dupNotice}>
              <strong>같은 종목이 여러 줄 있습니다.</strong><br />
              서로 다른 계좌(일반계좌·ISA)라면 그대로 두세요. 같은 계좌를 두 번 올렸다면 하나를 삭제해주세요.
            </div>
          )}

          {positions.length === 0 && (
            <div className={styles.empty}>
              <p>인식된 종목이 없습니다.</p>
              <p>주식잔고 화면을 캡처했는지 확인해주세요.</p>
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/')}>
                다시 업로드하기
              </button>
            </div>
          )}
          {cashSection}
        </div>
      )}

      {hasPositions && (
        <div className="fixed-cta">
          <button className="btn-primary" onClick={handleStart}>다음 →</button>
        </div>
      )}
    </div>
  )
}
