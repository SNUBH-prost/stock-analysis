'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Trade, Level, JournalEntry, Watchlist, Drawing } from '@/types/db'
import type { QuoteData, CandleData } from '@/types/kis'
import type { PnlResult } from '@/lib/pnl'
import TradeForm from '@/components/TradeForm'
import LevelEditor from '@/components/LevelEditor'

const Chart = dynamic(() => import('@/components/Chart'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-gray-950 flex items-center justify-center">
      <span className="text-gray-600 text-sm">차트 로딩 중...</span>
    </div>
  ),
})

type Tab = 'trades' | 'levels' | 'journal'

interface Props {
  code: string
  userId: string
  watchlistItem: Watchlist
  trades: Trade[]
  levels: Level[]
  journalEntries: JournalEntry[]
  drawings: Drawing[]
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
  drawings,
  quote,
  candles,
  pnl,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('trades')
  const [levels, setLevels] = useState(initialLevels)
  const [bottomOpen, setBottomOpen] = useState(true)

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

  const isPositive = !pnl || pnl.unrealizedPnlRate >= 0

  const TABS: { key: Tab; label: string }[] = [
    { key: 'trades', label: '매매' },
    { key: 'levels', label: '지지/저항' },
    { key: 'journal', label: '일지' },
  ]

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-950 flex-shrink-0 flex-wrap">
        <Link href="/" className="text-gray-500 hover:text-white transition-colors text-xs">
          ← 대시보드
        </Link>
        <span className="text-gray-700 text-xs">|</span>
        <span className="font-semibold text-sm">{watchlistItem.name}</span>
        <span className="text-gray-500 text-xs">{code}</span>

        {quote && (
          <>
            <span className="font-semibold">{quote.price.toLocaleString()}원</span>
            <span className={`text-sm ${quote.changeRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
              {quote.changeRate >= 0 ? '+' : ''}{quote.change.toLocaleString()}
              ({quote.changeRate >= 0 ? '+' : ''}{quote.changeRate.toFixed(2)}%)
            </span>
          </>
        )}

        {pnl && (
          <div className={`ml-auto text-xs ${isPositive ? 'text-red-400' : 'text-blue-400'}`}>
            평가손익 {isPositive ? '+' : ''}{pnl.unrealizedPnlRate.toFixed(2)}%
            &nbsp;({isPositive ? '+' : ''}{pnl.unrealizedPnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원)
            &nbsp;·&nbsp;평균 {pnl.position.avgBuyPrice.toLocaleString()}원 · {pnl.position.quantity}주 · {pnl.daysSinceBuy}일
          </div>
        )}
      </header>

      {/* Chart - fills remaining space */}
      <div className="flex-1 min-h-0">
        <Chart
          code={code}
          userId={userId}
          initialCandles={candles}
          levels={levels}
          trades={trades}
          avgBuyPrice={pnl?.position.avgBuyPrice}
          savedDrawings={drawings}
        />
      </div>

      {/* Bottom panel */}
      <div
        className="flex-shrink-0 border-t border-gray-800 bg-gray-950 flex flex-col"
        style={{ height: bottomOpen ? 260 : 40 }}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-800 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setBottomOpen(true) }}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                tab === t.key && bottomOpen
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setBottomOpen(v => !v)}
            className="ml-auto text-gray-600 hover:text-gray-400 text-xs px-2 py-1"
          >
            {bottomOpen ? '▼' : '▲'}
          </button>
        </div>

        {/* Tab content */}
        {bottomOpen && (
          <div className="flex-1 overflow-y-auto p-3">
            {tab === 'trades' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-medium text-gray-400 mb-2">매매 추가</h3>
                  <TradeForm code={code} userId={userId} onSuccess={() => router.refresh()} />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-400 mb-2">매매 기록</h3>
                  {trades.length === 0 ? (
                    <p className="text-gray-600 text-xs">기록 없음</p>
                  ) : (
                    <div className="space-y-1">
                      {trades.map(t => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium px-1.5 py-0.5 rounded ${
                                t.side === 'BUY'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {t.side === 'BUY' ? '매수' : '매도'}
                            </span>
                            <span className="text-gray-400">{t.trade_date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white">{t.price.toLocaleString()}원</span>
                            <span className="text-gray-500 ml-2">{t.quantity}주</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'levels' && (
              <LevelEditor
                code={code}
                userId={userId}
                levels={levels}
                onRefresh={refreshLevels}
              />
            )}

            {tab === 'journal' && (
              <JournalTab
                code={code}
                userId={userId}
                entries={journalEntries}
                onRefresh={() => router.refresh()}
              />
            )}
          </div>
        )}
      </div>
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
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">날짜</label>
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-gray-500"
          />
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder="매매 이유, 시나리오, 회고..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-gray-500 resize-none placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-white text-gray-950 rounded px-3 py-1.5 text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </form>

      {entries.map(entry => (
        <div key={entry.id} className="border border-gray-800 rounded p-2">
          <p className="text-xs text-gray-500 mb-1">{entry.entry_date}</p>
          <p className="text-xs text-gray-200 whitespace-pre-wrap">{entry.content}</p>
        </div>
      ))}
    </div>
  )
}
