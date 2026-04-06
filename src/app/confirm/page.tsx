'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmCard } from '@/components/ConfirmCard'
import { runDiagnosis } from '@/lib/engine'
import { DEFAULT_TARGET, SESSION_KEYS } from '@/lib/types'
import type { PortfolioPosition, AssetClass } from '@/lib/types'
import styles from './page.module.css'

export default function ConfirmPage() {
  const router = useRouter()
  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    if (typeof window === 'undefined') return []
    const raw = sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS)
    return raw ? (JSON.parse(raw) as PortfolioPosition[]) : []
  })
  const [loaded] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS) !== null
  })

  useEffect(() => {
    if (!loaded) router.replace('/')
  }, [loaded, router])

  const totalValue = positions.reduce((s, p) => s + p.value, 0)

  // 중복 티커 감지
  const nameCounts: Record<string, number> = {}
  for (const p of positions) nameCounts[p.name] = (nameCounts[p.name] ?? 0) + 1

  function handleDelete(id: string) {
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  function handleAssetClassChange(id: string, assetClass: AssetClass) {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, assetClass } : p))
  }

  function handleFieldChange(id: string, field: 'value' | 'avgCost' | 'currentPrice', value: number) {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function handleStart() {
    sessionStorage.setItem(SESSION_KEYS.CONFIRMED, JSON.stringify(positions))
    sessionStorage.setItem(SESSION_KEYS.TARGET, JSON.stringify(DEFAULT_TARGET))
    const diagnosis = runDiagnosis(positions, DEFAULT_TARGET)
    sessionStorage.setItem(SESSION_KEYS.DIAGNOSIS, JSON.stringify(diagnosis))
    router.push('/diagnosis')
  }

  if (!loaded) return null

  const hasDuplicates = Object.values(nameCounts).some(c => c > 1)

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

      <div className={styles.scroll}>
        {positions.map(p => (
          <ConfirmCard
            key={p.id}
            position={p}
            pct={totalValue > 0 ? Math.round((p.value / totalValue) * 1000) / 10 : 0}
            isDuplicate={(nameCounts[p.name] ?? 0) > 1}
            onDelete={handleDelete}
            onAssetClassChange={handleAssetClassChange}
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

      {positions.length > 0 && (
        <div className="fixed-cta">
          <button className="btn-primary" onClick={handleStart}>진단 시작</button>
        </div>
      )}
    </div>
  )
}
