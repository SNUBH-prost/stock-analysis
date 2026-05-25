import type { Trade } from '@/types/db'

export interface Position {
  code: string
  quantity: number
  avgBuyPrice: number
  totalCost: number
}

export interface PnlResult {
  position: Position
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlRate: number
  daysSinceBuy: number
}

// FIFO 기반 평균 매수가 + 포지션 계산
export function calcPosition(trades: Trade[]): Position | null {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  )

  // FIFO 큐: [price, qty]
  const queue: Array<[number, number]> = []

  for (const t of sorted) {
    if (t.side === 'BUY') {
      queue.push([t.price, t.quantity])
    } else {
      let remaining = t.quantity
      while (remaining > 0 && queue.length > 0) {
        const [, qty] = queue[0]
        if (qty <= remaining) {
          remaining -= qty
          queue.shift()
        } else {
          queue[0][1] -= remaining
          remaining = 0
        }
      }
    }
  }

  if (queue.length === 0) return null

  const totalQty = queue.reduce((s, [, q]) => s + q, 0)
  const totalCost = queue.reduce((s, [p, q]) => s + p * q, 0)

  return {
    code: trades[0].code,
    quantity: totalQty,
    avgBuyPrice: totalCost / totalQty,
    totalCost,
  }
}

export function calcPnl(
  trades: Trade[],
  currentPrice: number
): PnlResult | null {
  const position = calcPosition(trades)
  if (!position) return null

  const marketValue = currentPrice * position.quantity
  const unrealizedPnl = marketValue - position.totalCost
  const unrealizedPnlRate = (unrealizedPnl / position.totalCost) * 100

  // 첫 매수일 기준 경과일
  const firstBuy = trades
    .filter(t => t.side === 'BUY')
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())[0]

  const daysSinceBuy = firstBuy
    ? Math.floor(
        (Date.now() - new Date(firstBuy.trade_date).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0

  return { position, currentPrice, marketValue, unrealizedPnl, unrealizedPnlRate, daysSinceBuy }
}
