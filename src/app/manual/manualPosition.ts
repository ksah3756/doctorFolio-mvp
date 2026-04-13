import type { AssetClass, PortfolioPosition } from '@/lib/types'

export interface ManualPositionDraft {
  assetClass: '' | AssetClass
  code: string
  name: string
  sector: string
  value: string
  avgCost: string
  currentPrice: string
}

export const EMPTY_DRAFT: ManualPositionDraft = {
  assetClass: '',
  code: '',
  name: '',
  sector: '',
  value: '',
  avgCost: '',
  currentPrice: '',
}

function parseManualValue(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0

  return Number(digits)
}

export function isManualDraftComplete(
  draft: ManualPositionDraft
): draft is ManualPositionDraft & { assetClass: AssetClass } {
  return (
    draft.name.trim().length > 0 &&
    parseManualValue(draft.value) > 0 &&
    parseManualValue(draft.avgCost) > 0 &&
    parseManualValue(draft.currentPrice) > 0 &&
    draft.assetClass !== '' &&
    draft.sector.trim().length > 0
  )
}

export function createManualPosition(
  draft: ManualPositionDraft & { assetClass: AssetClass }
): PortfolioPosition {
  const value = parseManualValue(draft.value)
  const avgCost = parseManualValue(draft.avgCost)
  const currentPrice = parseManualValue(draft.currentPrice)
  const code = draft.code.trim()

  return {
    id: crypto.randomUUID(),
    name: draft.name.trim(),
    code: code || null,
    qty: 1,
    value,
    avgCost,
    currentPrice,
    assetClass: draft.assetClass,
    sector: draft.sector.trim(),
    sourceImage: 1,
  }
}
