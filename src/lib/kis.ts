import { z } from 'zod'
import {
  KisTokenResponseSchema,
  KisDailyResponseSchema,
  KisMinuteResponseSchema,
  KisQuoteResponseSchema,
  type CandleData,
  type QuoteData,
} from '@/types/kis'

const BASE_URL = process.env.KIS_BASE_URL ?? 'https://openapivts.koreainvestment.com:29443'
const APP_KEY = process.env.KIS_APP_KEY ?? ''
const APP_SECRET = process.env.KIS_APP_SECRET ?? ''

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null
let tokenPromise: Promise<string> | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt - now > 60 * 60 * 1000) {
    return tokenCache.token
  }
  if (tokenPromise) return tokenPromise

  tokenPromise = (async () => {
    const res = await fetch(`${BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: APP_KEY,
        appsecret: APP_SECRET,
      }),
    })

    if (!res.ok) {
      tokenPromise = null
      throw new Error(`KIS token fetch failed: ${res.status}`)
    }

    const raw = await res.json()
    const parsed = KisTokenResponseSchema.parse(raw)

    tokenCache = {
      token: parsed.access_token,
      expiresAt: now + parsed.expires_in * 1000,
    }

    tokenPromise = null
    return tokenCache.token
  })()

  return tokenPromise
}

function kisHeaders(token: string, trId: string) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    appkey: APP_KEY,
    appsecret: APP_SECRET,
    authorization: `Bearer ${token}`,
    tr_id: trId,
  }
}

export async function fetchQuote(code: string): Promise<QuoteData> {
  const token = await getAccessToken()
  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J',
    fid_input_iscd: code,
  })

  const res = await fetch(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`,
    {
      headers: kisHeaders(token, 'FHKST01010100'),
      next: { revalidate: 10 },
    }
  )

  if (!res.ok) throw new Error(`KIS quote failed: ${res.status}`)

  const raw = await res.json()
  const data = KisQuoteResponseSchema.parse(raw)

  if (data.rt_cd !== '0') throw new Error(`KIS quote error: ${data.msg1}`)

  const o = data.output
  return {
    code,
    name: o.hts_kor_isnm,
    price: Number(o.stck_prpr),
    change: Number(o.prdy_vrss),
    changeRate: Number(o.prdy_ctrt),
    open: Number(o.stck_oprc),
    high: Number(o.stck_hgpr),
    low: Number(o.stck_lwpr),
    volume: Number(o.acml_vol),
  }
}

export async function fetchDailyCandles(
  code: string,
  count = 1250,
  period: 'D' | 'W' | 'M' = 'D'
): Promise<CandleData[]> {
  const token = await getAccessToken()

  const today = new Date()
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
  const startDay = new Date(today)
  const daysBack = period === 'D' ? count * 2 : period === 'W' ? count * 9 : count * 35
  startDay.setDate(startDay.getDate() - daysBack)
  const startDate = startDay.toISOString().slice(0, 10).replace(/-/g, '')

  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J',
    fid_input_iscd: code,
    fid_input_date_1: startDate,
    fid_input_date_2: endDate,
    fid_period_div_code: period,
    fid_org_adj_prc: '0',
  })

  const res = await fetch(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`,
    {
      headers: kisHeaders(token, 'FHKST03010100'),
      next: { revalidate: 60 },
    }
  )

  if (!res.ok) throw new Error(`KIS daily failed: ${res.status}`)

  const raw = await res.json()
  const data = KisDailyResponseSchema.parse(raw)

  if (data.rt_cd !== '0') throw new Error(`KIS daily error: ${data.msg1}`)

  return data.output2
    .filter(item => item.stck_clpr !== '0')
    .map(item => ({
      timestamp: parseKisDate(item.stck_bsop_date),
      open: Number(item.stck_oprc),
      high: Number(item.stck_hgpr),
      low: Number(item.stck_lwpr),
      close: Number(item.stck_clpr),
      volume: Number(item.acml_vol),
    }))
    .reverse()
}

export async function fetchMinuteCandles(code: string): Promise<CandleData[]> {
  const token = await getAccessToken()

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

  const params = new URLSearchParams({
    fid_etc_cls_code: '',
    fid_cond_mrkt_div_code: 'J',
    fid_input_iscd: code,
    fid_input_hour_1: timeStr,
    fid_pw_data_incu_yn: 'Y',
  })

  const res = await fetch(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice?${params}`,
    {
      headers: kisHeaders(token, 'FHKST03010200'),
      next: { revalidate: 30 },
    }
  )

  if (!res.ok) throw new Error(`KIS minute failed: ${res.status}`)

  const raw = await res.json()
  const data = KisMinuteResponseSchema.parse(raw)

  if (data.rt_cd !== '0') throw new Error(`KIS minute error: ${data.msg1}`)

  return data.output2
    .map(item => ({
      timestamp: parseKisDateTime(item.stck_bsop_date, item.stck_cntg_hour),
      open: Number(item.stck_oprc),
      high: Number(item.stck_hgpr),
      low: Number(item.stck_lwpr),
      close: Number(item.stck_prpr),
      volume: Number(item.cntg_vol),
    }))
    .reverse()
}

function parseKisDate(dateStr: string): number {
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(4, 6)
  const d = dateStr.slice(6, 8)
  return new Date(`${y}-${m}-${d}T09:00:00+09:00`).getTime()
}

function parseKisDateTime(dateStr: string, timeStr: string): number {
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(4, 6)
  const d = dateStr.slice(6, 8)
  const h = timeStr.slice(0, 2)
  const min = timeStr.slice(2, 4)
  const s = timeStr.slice(4, 6)
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}+09:00`).getTime()
}

export { z }
