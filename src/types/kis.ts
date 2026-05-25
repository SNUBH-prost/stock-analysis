import { z } from 'zod'

export const KisTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  access_token_token_expired: z.string(),
})
export type KisTokenResponse = z.infer<typeof KisTokenResponseSchema>

const KisOutputSchema = z.object({
  stck_prpr: z.string(),
  stck_oprc: z.string(),
  stck_hgpr: z.string(),
  stck_lwpr: z.string(),
  acml_vol: z.string(),
  prdy_vrss: z.string(),
  prdy_ctrt: z.string(),
  hts_kor_isnm: z.string().catch(''),
})

export const KisQuoteResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string(),
  msg1: z.string(),
  output: KisOutputSchema,
})
export type KisQuoteResponse = z.infer<typeof KisQuoteResponseSchema>

const KisDailyItemSchema = z.object({
  stck_bsop_date: z.string(),
  stck_oprc: z.string(),
  stck_hgpr: z.string(),
  stck_lwpr: z.string(),
  stck_clpr: z.string(),
  acml_vol: z.string(),
})

export const KisDailyResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string(),
  msg1: z.string(),
  output2: z.array(KisDailyItemSchema),
})
export type KisDailyResponse = z.infer<typeof KisDailyResponseSchema>

const KisMinuteItemSchema = z.object({
  stck_bsop_date: z.string(),
  stck_cntg_hour: z.string(),
  stck_oprc: z.string(),
  stck_hgpr: z.string(),
  stck_lwpr: z.string(),
  stck_prpr: z.string(),
  cntg_vol: z.string(),
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
