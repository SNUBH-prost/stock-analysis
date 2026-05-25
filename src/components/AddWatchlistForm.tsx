'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Market } from '@/types/db'

interface Props {
  userId: string
}

export default function AddWatchlistForm({ userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [market, setMarket] = useState<Market>('KOSPI')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('watchlist').insert({
      user_id: userId,
      code,
      name,
      market,
    })

    if (err) {
      setError(err.message)
    } else {
      setCode('')
      setName('')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors border border-dashed border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2"
      >
        <span className="text-lg leading-none">+</span> 종목 추가
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">종목코드</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="005930"
          required
          pattern="\d{6}"
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm w-28 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">종목명</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="삼성전자"
          required
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm w-36 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">시장</label>
        <select
          value={market}
          onChange={e => setMarket(e.target.value as Market)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
        >
          <option value="KOSPI">KOSPI</option>
          <option value="KOSDAQ">KOSDAQ</option>
          <option value="ETF">ETF</option>
        </select>
      </div>
      {error && <p className="w-full text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-white text-gray-950 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        {loading ? '...' : '추가'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors px-2 py-2"
      >
        취소
      </button>
    </form>
  )
}
