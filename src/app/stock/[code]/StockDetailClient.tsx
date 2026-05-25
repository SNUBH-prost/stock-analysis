'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Trade, Level, JournalEntry, Watchlist } from '@/types/db'
import type { QuoteData, CandleData } from '@/types/kis'
import type { PnlResult } from '@/lib/pnl'
import TradeForm from '@/components/TradeForm'
import LevelEditor from '@/components/LevelEditor'

const Chart = dynamic(() => import('@/components/Chart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[640px] bg-gray-900 rounded-xl flex items-center justify-center">
      <span className="text-gray-600 text-sm">차트 로딩 중...</span>
    </div>
  ),
})

type Tab = 'chart' | 'trades' | 'levels' | 'journal'

interface Props {
  code: string
  userId: string
  watchlistItem: Watchlist
  trades: Trade[]
  levels: Level[]
  journalEntries: JournalEntry[]
  quote: QuoteData | null
  candles: CandleData[]
  pnl: PnlResult | null
}

export default function StockDetailClient({
  code,
  userId,
  watchlistItem,
  trades,
  levels: initialLevels,
  journalEntries,
  quote,
  candles,
  pnl,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('chart')
  const [levels, setLevels] = useState(initialLevels)

  const refreshLevels = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('levels')
      .select('*')
      .eq('code', code)
      .eq('user_id', userId)
    if (data) setLevels(data)
  }, [code, userId])

  const isPositive = pnl && pnl.unrealizedPnlRate >= 0

  const TABS: { key: Tab; label: string }[] = [
    { key: 'chart', label: '차트' },
    { key: 'trades', label: '매매' },
    { key: 'levels', label: '선' },
    { key: 'journal', label: '일지' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm">
          ← 대시보드
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="font-semibold">
          {watchlistItem.name}
          <span className="text-gray-500 font-normal text-sm ml-2">{code}</span>
        </h1>
      </div>

      {/* 현재가 요약 */}
      {quote && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 flex flex-wrap gap-4">
          <div>
            <p className="text-2xl font-semibold">{quote.price.toLocaleString()}원</p>
            <p className={`text-sm mt-0.5 ${quote.changeRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
              {quote.changeRate >= 0 ? '+' : ''}{quote.change.toLocaleString()}원
              ({quote.changeRate >= 0 ? '+' : ''}{quote.changeRate.toFixed(2)}%)
            </p>
          </div>
          {pnl && (
            <div className="ml-auto text-right">
              <p className={`text-lg font-semibold ${isPositive ? 'text-red-400' : 'text-blue-400'}`}>
                {isPositive ? '+' : ''}{pnl.unrealizedPnlRate.toFixed(2)}%
              </p>
              <p className={`text-sm ${isPositive ? 'text-red-400' : 'text-blue-400'}`}>
                {isPositive ? '+' : ''}{pnl.unrealizedPnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                평균 {pnl.position.avgBuyPrice.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원 ·
                {pnl.position.quantity}주 · {pnl.daysSinceBuy}일
              </p>
            </div>
          )}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-900 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              tab === t.key
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 차트 탭 */}
      {tab === 'chart' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden" style={{ height: 640 }}>
          {candles.length > 0 ? (
            <Chart candles={candles} levels={levels} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              시세 데이터를 가져올 수 없습니다
            </div>
          )}
        </div>
      )}

      {/* 매매 탭 */}
      {tab === 'trades' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-4">매매 추가</h3>
            <TradeForm code={code} userId={userId} onSuccess={() => router.refresh()} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-4">매매 기록</h3>
            {trades.length === 0 ? (
              <p className="text-gray-600 text-sm">기록 없음</p>
            ) : (
              <div className="space-y-2">
                {trades.map(t => (
<div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        t.side === 'BUY'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {t.side === 'BUY' ? '매수' : '매도'}
                      </span>
                      <span className="text-gray-400 text-xs">{t.trade_date}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{t.price.toLocaleString()}원</p>
                      <p className="text-gray-500 text-xs">{t.quantity}주</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 지지/저항선 탭 */}
      {tab === 'levels' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 max-w-sm">
          <h3 className="text-sm font-medium mb-4">지지/저항선</h3>
          <LevelEditor
            code={code}
            userId={userId}
            levels={levels}
            onRefresh={refreshLevels}
          />
        </div>
      )}

      {/* 일지 탭 */}
      {tab === 'journal' && (
        <JournalTab
          code={code}
          userId={userId}
          entries={journalEntries}
          onRefresh={() => router.refresh()}
        />
      )}
    </div>
  )
}

function JournalTab({
  code,
  userId,
  entries,
  onRefresh,
}: {
  code: string
  userId: string
  entries: JournalEntry[]
  onRefresh: () => void
}) {
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('journal_entries').insert({
      user_id: userId,
      code,
      entry_date: entryDate,
      content,
    })
    setContent('')
    onRefresh()
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">날짜</label>
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          placeholder="매매 이유, 시나리오, 회고..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 resize-none placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-white text-gray-950 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </form>

      {entries.map(entry => (
        <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">{entry.entry_date}</p>
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{entry.content}</p>
        </div>
      ))}
    </div>
  )
}
