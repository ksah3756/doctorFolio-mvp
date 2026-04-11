'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmCard } from '@/components/ConfirmCard'
import { runDiagnosis } from '@/lib/engine'
import { DEFAULT_TARGET, SESSION_KEYS } from '@/lib/types'
import type { PortfolioPosition, AssetClass, TargetAllocation } from '@/lib/types'
import styles from './page.module.css'

const TARGET_FIELDS: Array<keyof TargetAllocation> = ['국내주식', '해외주식', '채권']
const CASH_POSITION_ID = 'manual-cash-position'

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

function readStoredTarget(): TargetAllocation {
  if (typeof window === 'undefined') return { ...DEFAULT_TARGET }

  const raw = sessionStorage.getItem(SESSION_KEYS.TARGET)
  if (!raw) return { ...DEFAULT_TARGET }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof TargetAllocation, unknown>>
    return {
      '국내주식': typeof parsed['국내주식'] === 'number' ? parsed['국내주식'] : DEFAULT_TARGET['국내주식'],
      '해외주식': typeof parsed['해외주식'] === 'number' ? parsed['해외주식'] : DEFAULT_TARGET['해외주식'],
      '채권': typeof parsed['채권'] === 'number' ? parsed['채권'] : DEFAULT_TARGET['채권'],
    }
  } catch {
    return { ...DEFAULT_TARGET }
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

export default function ConfirmPage() {
  const router = useRouter()
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const [positions, setPositions] = useState<PortfolioPosition[]>(() => readStoredPositions())
  const [originalSectors] = useState<Record<string, string>>(() =>
    Object.fromEntries(readStoredPositions().map(position => [position.id, position.sector]))
  )
  const [loaded] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS) !== null
  })
  const [target, setTarget] = useState<TargetAllocation>(() => readStoredTarget())
  const [cashInput, setCashInput] = useState(() => readStoredCash())

  const cashAmount = parseCashAmount(cashInput)
  const diagnosisPositions = cashAmount > 0 ? [...positions, createCashPosition(cashAmount)] : positions

  useEffect(() => {
    if (!loaded) router.replace('/')
  }, [loaded, router])

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

  function handleDelete(id: string) {
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  function handleAssetClassChange(id: string, assetClass: AssetClass) {
    if (id === CASH_POSITION_ID) return
    setPositions(prev => prev.map(p => p.id === id ? { ...p, assetClass } : p))
  }

  function handleSectorChange(id: string, sector: string) {
    if (id === CASH_POSITION_ID) return
    const nextSector = sector || originalSectors[id] || '기타'

    setPositions(prev => {
      const nextPositions = prev.map(p => p.id === id ? { ...p, sector: nextSector } : p)
      sessionStorage.setItem(SESSION_KEYS.RAW_POSITIONS, JSON.stringify(nextPositions))
      return nextPositions
    })
  }

  function handleFieldChange(id: string, field: 'value' | 'avgCost' | 'currentPrice', value: number) {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function handleTargetChange(assetClass: keyof TargetAllocation, value: number) {
    setTarget(prev => ({ ...prev, [assetClass]: value }))
  }

  function handleStart() {
    sessionStorage.setItem(SESSION_KEYS.CONFIRMED, JSON.stringify(diagnosisPositions))
    sessionStorage.setItem(SESSION_KEYS.TARGET, JSON.stringify(target))
    const diagnosis = runDiagnosis(diagnosisPositions, target)
    sessionStorage.setItem(SESSION_KEYS.DIAGNOSIS, JSON.stringify(diagnosis))
    router.push('/diagnosis')
  }

  if (!loaded) return null

  const hasDuplicates = Object.values(nameCounts).some(c => c > 1)
  const targetSum = TARGET_FIELDS.reduce((sum, assetClass) => sum + target[assetClass], 0)
  const isTargetBalanced = targetSum === 100
  const hasPositions = positions.length > 0

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
      </div>
      )}

      {hasPositions && (
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
      )}

      {hasPositions && (
        <div className={styles.partDivider}>
          <hr className={styles.partDividerLine} />
          <span className={styles.partDividerLabel}>지금 가진 것 → 앞으로 원하는 것</span>
          <hr className={styles.partDividerLine} />
        </div>
      )}

      {hasPositions && (
        <section className={styles.targetSection}>
          <div className={styles.targetHeader}>
            <h2 className={styles.targetTitle}>목표 배분 조정</h2>
            <p className={styles.targetHint}>원하는 비중으로 슬라이더를 조정한 뒤 진단을 시작하세요.</p>
          </div>

          <div className={styles.sliderList}>
            {TARGET_FIELDS.map(assetClass => (
              <label key={assetClass} className={styles.sliderRow}>
                <div className={styles.sliderMeta}>
                  <span className={styles.sliderLabel}>{assetClass}</span>
                  <span className={styles.sliderValue}>{target[assetClass]}%</span>
                </div>
                <input
                  className={styles.slider}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={target[assetClass]}
                  onChange={e => handleTargetChange(assetClass, Number(e.target.value))}
                />
              </label>
            ))}
          </div>

          <div
            className={`${styles.targetSummary} ${
              isTargetBalanced ? styles.targetSummaryValid : styles.targetSummaryInvalid
            }`}
          >
            <span className={styles.targetSummaryLabel}>합계</span>
            <strong className={styles.targetSummaryValue}>{targetSum}%</strong>
            <span className={styles.targetSummaryMessage}>
              {isTargetBalanced ? '합계가 100%입니다.' : '합계가 100%가 되도록 조정해주세요.'}
            </span>
          </div>
        </section>
      )}

      {hasPositions && (
        <div className="fixed-cta">
          <button className="btn-primary" onClick={handleStart}>진단 시작</button>
        </div>
      )}
    </div>
  )
}
