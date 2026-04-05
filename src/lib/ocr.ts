import { autoClassify } from './sectors'
import type { PortfolioPosition } from './types'

export type OcrRaw = {
  name: string
  code: string | null
  qty: number | null
  value: number | null
  avgCost: number | null
}

export function parseOcrResponse(text: string): OcrRaw[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    return JSON.parse(match[0]) as OcrRaw[]
  } catch {
    return []
  }
}

export function normalizeOcrItems(
  rawItems: OcrRaw[],
  sourceImage: number,
  createId: () => string = () => crypto.randomUUID(),
): PortfolioPosition[] {
  return rawItems.flatMap(raw => {
    if (!raw.name || !raw.value) return []

    const qty = raw.qty && raw.qty > 0 ? raw.qty : 1
    const value = raw.value
    const avgCost = raw.avgCost ?? value / qty
    const currentPrice = value / qty
    const { sector, assetClass } = autoClassify(raw.name, raw.code)

    return [{
      id: createId(),
      name: raw.name,
      code: raw.code,
      qty,
      value,
      avgCost,
      currentPrice,
      assetClass,
      sector,
      sourceImage,
    }]
  })
}
