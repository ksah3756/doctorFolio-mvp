import type { AssetClass, PortfolioPosition } from '@/lib/types'

export interface ManualPositionDraft {
  assetClass: '' | AssetClass
  code: string
  name: string
  value: string
}

export const EMPTY_DRAFT: ManualPositionDraft = {
  assetClass: '',
  code: '',
  name: '',
  value: '',
}

function parseManualValue(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0

  return Number(digits)
}

export function isManualDraftComplete(
  draft: ManualPositionDraft
): draft is ManualPositionDraft & { assetClass: AssetClass } {
  return draft.name.trim().length > 0 && parseManualValue(draft.value) > 0 && draft.assetClass !== ''
}

export function createManualPosition(
  draft: ManualPositionDraft & { assetClass: AssetClass }
): PortfolioPosition {
  const amount = parseManualValue(draft.value)
  const code = draft.code.trim()

  return {
    id: crypto.randomUUID(),
    name: draft.name.trim(),
    code: code || null,
    qty: 1,
    value: amount,
    avgCost: amount,
    currentPrice: amount,
    assetClass: draft.assetClass,
    sector: draft.assetClass,
    sourceImage: 1,
  }
}
