import { z } from 'zod'

export const KisTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  access_token_token_expired: z.string(),
})
export type KisTokenResponse = z.infer<typeof KisTokenResponseSchema>

const KisOutputSchema = z.object({
  stck_prpr: z.string(),   // 주식 현재가
  stck_oprc: z.string(),   // 시가
  stck_hgpr: z.string(),   // 고가
  stck_lwpr: z.string(),   // 저가
  acml_vol: z.string(),    // 누적 거래량
  prdy_vrss: z.string(),   // 전일 대비
  prdy_ctrt: z.string(),   // 전일 대비율
  hts_kor_isnm: z.string(), // 종목명
})

export const KisQuoteResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string(),
  msg1: z.string(),
  output: KisOutputSchema,
})
export type KisQuoteResponse = z.infer<typeof KisQuoteResponseSchema>

const KisDailyItemSchema = z.object({
  stck_bsop_date: z.string(), // 영업일자 YYYYMMDD
  stck_oprc: z.string(),      // 시가
  stck_hgpr: z.string(),      // 고가
  stck_lwpr: z.string(),      // 저가
  stck_clpr: z.string(),      // 종가
  acml_vol: z.string(),       // 누적 거래량
})

export const KisDailyResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string(),
  msg1: z.string(),
  output2: z.array(KisDailyItemSchema),
})
export type KisDailyResponse = z.infer<typeof KisDailyResponseSchema>

const KisMinuteItemSchema = z.object({
  stck_bsop_date: z.string(), // 영업일자
  stck_cntg_hour: z.string(), // 체결 시각 HHMMSS
  stck_oprc: z.string(),
  stck_hgpr: z.string(),
  stck_lwpr: z.string(),
  stck_prpr: z.string(),      // 종가(현재가)
  cntg_vol: z.string(),       // 체결 거래량
})

export const KisMinuteResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string(),
  msg1: z.string(),
  output2: z.array(KisMinuteItemSchema),
})
export type KisMinuteResponse = z.infer<typeof KisMinuteResponseSchema>

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface QuoteData {
  code: string
  name: string
  price: number
  change: number
  changeRate: number
  open: number
  high: number
  low: number
  volume: number
}
