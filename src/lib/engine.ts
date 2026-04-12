// src/lib/engine.ts
import type {
  PortfolioPosition, TargetAllocation, DiagnosisResult,
  Problem, Action, AssetClass, Severity, AllocationBucket,
} from './types'

const DRIFT_THRESHOLD = 10        // pp 이상 이탈 시 문제
const CONCENTRATION_STOCK = 30   // % 초과 시 집중 위험
const CONCENTRATION_SECTOR = 50  // % 초과 시 섹터 집중

function pct(value: number, total: number): number {
  return Math.round((value / total) * 1000) / 10  // 소수점 1자리
}

function groupByAssetClass(positions: PortfolioPosition[]): Record<AssetClass, number> {
  const result: Record<AssetClass, number> = { '국내주식': 0, '해외주식': 0, '채권': 0, '기타': 0 }
  for (const p of positions) result[p.assetClass] += p.value
  return result
}

function isCashPosition(position: PortfolioPosition): boolean {
  return position.assetClass === '기타' && position.name === '현금'
}

function buildDriftProblems(
  current: Record<AllocationBucket, number>,
  target: TargetAllocation,
  total: number,
): Problem[] {
  const problems: Problem[] = []
  const assetClasses: Array<keyof TargetAllocation> = ['국내주식', '해외주식', '채권', '현금']

  for (const ac of assetClasses) {
    const currentPct = pct(current[ac], total)
    const targetPct = target[ac]
    const diff = currentPct - targetPct

    if (Math.abs(diff) < DRIFT_THRESHOLD) continue

    const over = diff > 0
    const severity: Severity = Math.abs(diff) >= 20 ? 'high' : 'medium'
    const labelMap: Record<keyof TargetAllocation, string> = {
      '국내주식': '국내주식',
      '해외주식': '해외주식',
      '채권': '채권',
      '현금': '현금',
    }

    problems.push({
      type: 'drift',
      severity,
      assetClass: ac,
      current: currentPct,
      target: targetPct,
      label: over
        ? `${labelMap[ac]}에 너무 쏠려 있습니다`
        : `${labelMap[ac]}이 부족합니다`,
      description: over
        ? `현재 ${currentPct}%로 목표(${targetPct}%)보다 ${Math.round(diff)}%p 높습니다.`
        : `현재 ${currentPct}%로 목표(${targetPct}%)보다 ${Math.round(-diff)}%p 낮습니다.`,
    })
  }

  // 내림차순 정렬 (큰 이탈 먼저)
  return problems.sort((a, b) => Math.abs(b.current - b.target) - Math.abs(a.current - a.target))
}

function buildConcentrationProblems(positions: PortfolioPosition[], total: number): Problem[] {
  const problems: Problem[] = []

  // 단일 종목 — 30% 초과 시 집중 위험
  for (const p of positions) {
    if (isCashPosition(p)) continue

    const currentPct = pct(p.value, total)
    if (currentPct > CONCENTRATION_STOCK) {
      problems.push({
        type: 'concentration_stock',
        severity: 'high',
        ticker: p.name,
        current: currentPct,
        target: CONCENTRATION_STOCK,
        label: `${p.name} 한 종목이 ${currentPct}%입니다`,
        description: `단일 종목이 포트폴리오의 ${CONCENTRATION_STOCK}%를 넘으면 집중 위험입니다.`,
      })
    }
  }

  // 섹터
  const bySector: Record<string, number> = {}
  for (const p of positions) {
    bySector[p.sector] = (bySector[p.sector] ?? 0) + p.value
  }
  for (const [sector, sectorValue] of Object.entries(bySector)) {
    if (sector === '기타') continue  // 기타는 분류 불명으로 섹터 집중 검사 제외
    const currentPct = pct(sectorValue, total)
    if (currentPct > CONCENTRATION_SECTOR) {
      problems.push({
        type: 'concentration_sector',
        severity: 'medium',
        sector,
        current: currentPct,
        target: CONCENTRATION_SECTOR,
        label: `${sector} 섹터가 ${currentPct}%입니다`,
        description: `단일 섹터 ${CONCENTRATION_SECTOR}% 초과는 섹터 집중 위험입니다.`,
      })
    }
  }

  return problems
}

function buildActions(
  positions: PortfolioPosition[],
  current: Record<AllocationBucket, number>,
  target: TargetAllocation,
  total: number,
): Action[] {
  const actions: Action[] = []

  for (const ac of ['국내주식', '해외주식', '채권', '현금'] as Array<keyof TargetAllocation>) {
    const currentPct = pct(current[ac], total)
    const targetPct = target[ac]
    const diff = currentPct - targetPct

    if (Math.abs(diff) < DRIFT_THRESHOLD) continue
    if (ac === '현금') continue

    const adjustAmount = Math.abs(diff / 100) * total
    const classPositions = positions.filter(p => p.assetClass === ac)
    if (classPositions.length === 0) continue

    // 가장 큰 포지션 선택
    const largest = classPositions.sort((a, b) => b.value - a.value)[0]

    if (diff > 0) {
      // 과초과 → 매도
      const qty = Math.floor(Math.min(adjustAmount, largest.value * 0.5) / largest.currentPrice)
      if (qty <= 0) continue

      const estimatedAmount = qty * largest.currentPrice
      const action: Action = {
        ticker: largest.code ?? largest.name,
        name: largest.name,
        action: 'sell',
        quantity: qty,
        estimatedAmount,
      }

      // 해외주식 차익세 추정
      if (largest.assetClass === '해외주식') {
        const gain = (largest.currentPrice - largest.avgCost) * qty
        if (gain > 0) action.taxEstimate = Math.floor(gain * 0.22)
      }

      actions.push(action)
    } else {
      // 부족 → 매수
      const qty = Math.floor(adjustAmount / largest.currentPrice)
      if (qty <= 0) continue

      actions.push({
        ticker: largest.code ?? largest.name,
        name: largest.name,
        action: 'buy',
        quantity: qty,
        estimatedAmount: qty * largest.currentPrice,
      })
    }
  }

  return actions
}

export function runDiagnosis(
  positions: PortfolioPosition[],
  target: TargetAllocation,
): DiagnosisResult {
  if (positions.length === 0) {
    return {
      problems: [],
      actions: [],
      currentAllocation: { '국내주식': 0, '해외주식': 0, '채권': 0, '현금': 0, '기타': 0 },
      targetAllocation: target,
      totalValue: 0,
    }
  }

  const total = positions.reduce((s, p) => s + p.value, 0)
  const byAssetClass = groupByAssetClass(positions)
  const cashValue = positions.filter(isCashPosition).reduce((sum, position) => sum + position.value, 0)
  const allocationAmounts: Record<AllocationBucket, number> = {
    '국내주식': byAssetClass['국내주식'],
    '해외주식': byAssetClass['해외주식'],
    '채권': byAssetClass['채권'],
    '현금': cashValue,
    '기타': Math.max(byAssetClass['기타'] - cashValue, 0),
  }
  const currentAllocation = {
    '국내주식': pct(allocationAmounts['국내주식'], total),
    '해외주식': pct(allocationAmounts['해외주식'], total),
    '채권': pct(allocationAmounts['채권'], total),
    '현금': pct(allocationAmounts['현금'], total),
    '기타': pct(allocationAmounts['기타'], total),
  }

  const driftProblems = buildDriftProblems(allocationAmounts, target, total)
  const concProblems = buildConcentrationProblems(positions, total)
  const problems = [...concProblems.filter(p => p.type === 'concentration_stock'), ...driftProblems, ...concProblems.filter(p => p.type === 'concentration_sector')]

  return {
    problems,
    actions: buildActions(positions, allocationAmounts, target, total),
    currentAllocation,
    targetAllocation: target,
    totalValue: total,
  }
}
