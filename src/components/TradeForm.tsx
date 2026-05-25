'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TradeSide } from '@/types/db'

interface Props {
  code: string
  userId: string
  onSuccess?: () => void
}

export default function TradeForm({ code, userId, onSuccess }: Props) {
  const [side, setSide] = useState<TradeSide>('BUY')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('trades').insert({
      user_id: userId,
      code,
      side,
      price: Number(price),
      quantity: Number(quantity),
      trade_date: tradeDate,
      memo: memo || null,
    })

    if (err) {
      setError(err.message)
    } else {
      setPrice('')
      setQuantity('')
      setMemo('')
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {(['BUY', 'SELL'] as TradeSide[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              side === s
                ? s === 'BUY'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-gray-800 text-gray-400 border border-transparent'
            }`}
          >
            {s === 'BUY' ? '매수' : '매도'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">가격 (원)</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
            min={0}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">수량 (주)</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
            min={1}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">날짜</label>
        <input
          type="date"
          value={tradeDate}
          onChange={e => setTradeDate(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">메모 (선택)</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={2}
          placeholder="매매 이유, 시나리오..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 resize-none placeholder-gray-600"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-gray-950 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        {loading ? '저장 중...' : '기록 추가'}
      </button>
    </form>
  )
}
