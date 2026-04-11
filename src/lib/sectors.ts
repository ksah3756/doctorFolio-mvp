import type { AssetClass } from './types'
import sectorData from '../data/sectors.json'

type Classification = { sector: string; assetClass: AssetClass }
type SectorEntry = Classification

const db = new Map(
  Object.entries(sectorData as Record<string, SectorEntry>).map(([name, entry]) => [
    normalizeLookupName(name),
    entry,
  ]),
)

const ETF_PREFIX_RE = /^(TIGER|KODEX|KINDEX|RISE|ARIRANG|HANARO|KOSEF|SOL|ACE|KBSTAR|PLUS|TIMEFOLIO|WON|KIWOOM)/i

function normalizeLookupName(name: string): string {
  return name.replace(/\s+/g, '')
}

function classifyEtfByName(name: string): Classification {
  if (/채권|국채|국공채|회사채|금융물|통안|단기|크레딧|Bond/i.test(name))
    return { sector: '채권ETF', assetClass: '채권' }
  if (/구리|금\b|은\b|원유|원자재|농산물|리츠|REIT/i.test(name))
    return { sector: '원자재ETF', assetClass: '기타' }
  if (/미국|S&P|나스닥|다우|NYSE|QQQ|MSCI|중국|일본|신흥국|유럽|베트남|인도|글로벌|선진국/i.test(name))
    return { sector: '미국ETF', assetClass: '해외주식' }
  return { sector: '국내ETF', assetClass: '국내주식' }
}

export function autoClassify(
  name: string,
  code: string | null,
): Classification {
  const normalizedName = normalizeLookupName(name)

  if (normalizedName) {
    const entry = db.get(normalizedName)
    if (entry) {
      return { sector: entry.sector, assetClass: entry.assetClass }
    }
  }

  if (code && /^[A-Z]{1,5}$/.test(code)) {
    return { sector: '미국주식', assetClass: '해외주식' }
  }

  if (ETF_PREFIX_RE.test(name.trim())) {
    return classifyEtfByName(name)
  }

  if (/채권|Bond/i.test(name)) {
    return { sector: '채권ETF', assetClass: '채권' }
  }

  if (code && /^\d{6}$/.test(code)) {
    return { sector: '기타', assetClass: '국내주식' }
  }

  return { sector: '기타', assetClass: '기타' }
}
