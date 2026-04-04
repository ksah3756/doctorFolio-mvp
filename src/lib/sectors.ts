// src/lib/sectors.ts
import type { AssetClass } from './types'
import sectorData from '../data/sectors.json'

type SectorEntry = { name: string; sector: string; assetClass: AssetClass }
const db = sectorData as Record<string, SectorEntry>

// ETF 이름 패턴으로 분류
function classifyByName(name: string): { sector: string; assetClass: AssetClass } {
  if (/미국|S&P|나스닥|다우|NYSE|QQQ|MSCI/.test(name))
    return { sector: '미국 ETF', assetClass: '해외주식' }
  if (/중국|일본|신흥국|유럽|베트남|인도/.test(name))
    return { sector: '해외 ETF', assetClass: '해외주식' }
  if (/채권|국채|금융물|통안|회사채|단기|크레딧/.test(name))
    return { sector: '채권 ETF', assetClass: '채권' }
  if (/구리|금\b|은\b|원유|원자재|농산물|리츠|REIT/.test(name))
    return { sector: '원자재 ETF', assetClass: '기타' }
  if (/반도체|IT|기술|테크|AI|인공지능/.test(name))
    return { sector: '테크 ETF', assetClass: '국내주식' }
  if (/배당|고배당/.test(name))
    return { sector: '배당 ETF', assetClass: '국내주식' }
  return { sector: '국내 ETF', assetClass: '국내주식' }
}

// 코드로 자산군 자동 분류 (OCR 코드 없을 때 이름으로)
export function autoClassify(
  name: string,
  code: string | null
): { sector: string; assetClass: AssetClass } {
  // 1. DB 조회
  if (code && db[code]) {
    const entry = db[code]
    return { sector: entry.sector, assetClass: entry.assetClass }
  }

  // 2. 알파벳 코드 → 미국주식 (AAPL, NVDA 등)
  if (code && /^[A-Z]{1,5}$/.test(code))
    return { sector: '미국주식', assetClass: '해외주식' }

  // 3. ETF 이름 패턴 (TIGER, KODEX, KINDEX, RISE 등으로 시작하면 ETF)
  if (/^(TIGER|KODEX|KINDEX|RISE|ARIRANG|HANARO|KOSEF|SOL|ACE|KIM|HIQ)/.test(name))
    return classifyByName(name)

  // 4. 이름에 "채권/Bond" 포함
  if (/채권|Bond/.test(name)) return { sector: '채권', assetClass: '채권' }

  // 5. 6자리 숫자 코드 → 국내주식
  if (code && /^\d{6}$/.test(code)) return { sector: '기타', assetClass: '국내주식' }

  return { sector: '기타', assetClass: '기타' }
}
