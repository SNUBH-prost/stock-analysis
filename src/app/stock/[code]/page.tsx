import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchDailyCandles, fetchQuote } from '@/lib/kis'
import { calcPnl } from '@/lib/pnl'
import StockDetailClient from './StockDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ code: string }>
}

export default async function StockDetailPage({ params }: Props) {
  const { code } = await params

  if (!/^\d{6}$/.test(code)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: watchlistItem },
    { data: trades },
    { data: levels },
    { data: journalEntries },
    { data: drawings },
  ] = await Promise.all([
    supabase.from('watchlist').select('*').eq('code', code).eq('user_id', user.id).single(),
    supabase.from('trades').select('*').eq('code', code).eq('user_id', user.id).order('trade_date', { ascending: false }),
    supabase.from('levels').select('*').eq('code', code).eq('user_id', user.id),
    supabase.from('journal_entries').select('*').eq('code', code).eq('user_id', user.id).order('entry_date', { ascending: false }),
    supabase.from('drawings').select('*').eq('code', code).eq('user_id', user.id),
  ])

  if (!watchlistItem) notFound()

  // 시세 + 일봉 병렬 조회
  const [quoteResult, candlesResult] = await Promise.allSettled([
    fetchQuote(code),
    fetchDailyCandles(code),
  ])

  const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null
  const candles = candlesResult.status === 'fulfilled' ? candlesResult.value : []

  const pnl = quote && trades && trades.length > 0
    ? calcPnl(trades, quote.price)
    : null

  return (
    <StockDetailClient
      code={code}
      userId={user.id}
      watchlistItem={watchlistItem}
      trades={trades ?? []}
      levels={levels ?? []}
      journalEntries={journalEntries ?? []}
      drawings={drawings ?? []}
      quote={quote}
      candles={candles}
      pnl={pnl}
    />
  )
}
