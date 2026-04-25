import { Redis } from '@upstash/redis'
import * as XLSX from 'xlsx'
import { canUseRateLimit } from '@/lib/rateLimit'

const CACHE_KEY = 'damodaran:erp:latest'
const CACHE_TTL_SECONDS = 28 * 24 * 60 * 60
const DAMODARAN_ERP_FALLBACK = 0.047
const DAMODARAN_ERP_URL = 'https://pages.stern.nyu.edu/~adamodar/pc/implprem/ERPbymonth.xlsx'
const TARGET_COLUMN = 'ERP (T12m)'

let redis: Redis | null | undefined

export async function fetchImpliedErp(): Promise<number> {
  const client = getRedisClient()

  if (client) {
    try {
      const cached = await client.get<number | string>(CACHE_KEY)
      const parsedCached = parseErpValue(cached)

      if (parsedCached !== null) {
        return parsedCached
      }
    } catch {
      // Redis failure should not interrupt valuation requests.
    }
  }

  try {
    const response = await fetch(DAMODARAN_ERP_URL, {
      next: { revalidate: CACHE_TTL_SECONDS },
    })

    if (!response.ok) {
      throw new Error(`Damodaran ERP fetch failed: ${response.status}`)
    }

    const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
      header: 1,
      defval: null,
      raw: true,
    })
    const erp = extractLatestErp(rows)

    if (client) {
      try {
        await client.setex(CACHE_KEY, CACHE_TTL_SECONDS, erp)
      } catch {
        // Ignore cache write failures and continue with fresh ERP.
      }
    }

    return erp
  } catch (error) {
    console.error('Damodaran ERP fallback engaged', error)
    return DAMODARAN_ERP_FALLBACK
  }
}

function extractLatestErp(rows: Array<Array<string | number | null>>): number {
  const headerRow = rows.find(row => row.includes(TARGET_COLUMN))

  if (!headerRow) {
    throw new Error('Damodaran ERP header row not found')
  }

  const targetColumnIndex = headerRow.indexOf(TARGET_COLUMN)

  for (let index = rows.length - 1; index > 0; index -= 1) {
    const row = rows[index]
    const erp = parseErpValue(row[targetColumnIndex])

    if (erp !== null) {
      return erp
    }
  }

  throw new Error('Damodaran ERP value not found')
}

function getRedisClient(): Redis | null {
  if (redis !== undefined) {
    return redis
  }

  if (!canUseRateLimit()) {
    redis = null
    return redis
  }

  redis = Redis.fromEnv()
  return redis
}

function parseErpValue(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  return null
}
