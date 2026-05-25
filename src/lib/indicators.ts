import { SMA, EMA, MACD, RSI, BollingerBands } from 'technicalindicators'
import type { CandleData } from '@/types/kis'

export interface IndicatorResult {
  ma20: (number | null)[]
  ma60: (number | null)[]
  ema20: (number | null)[]
  macd: ({ MACD?: number; signal?: number; histogram?: number } | null)[]
  rsi: (number | null)[]
  boll: ({ upper: number; middle: number; lower: number } | null)[]
}

function pad<T>(arr: T[], length: number): (T | null)[] {
  const diff = length - arr.length
  return diff > 0 ? ([...Array(diff).fill(null), ...arr] as (T | null)[]) : (arr as (T | null)[])
}

export function calcIndicators(candles: CandleData[]): IndicatorResult {
  const closes = candles.map(c => c.close)

  const ma20 = pad(SMA.calculate({ period: 20, values: closes }), closes.length)
  const ma60 = pad(SMA.calculate({ period: 60, values: closes }), closes.length)
  const ema20 = pad(EMA.calculate({ period: 20, values: closes }), closes.length)

  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })
  const macd = pad(macdRaw, closes.length)

  const rsiRaw = RSI.calculate({ period: 14, values: closes })
  const rsi = pad(rsiRaw, closes.length)

  const bollRaw = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 })
  const boll = pad(bollRaw, closes.length)

  return { ma20, ma60, ema20, macd, rsi, boll }
}
