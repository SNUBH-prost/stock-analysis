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
  ] = await Promise.all([
    supabase.from('watchlist').select('*').eq('code', code).eq('user_id', user.id).single(),
    supabase.from('trades').select('*').eq('code', code).eq('user_id', user.id).order('trade_date', { ascending: false }),
    supabase.from('levels').select('*').eq('code', code).eq('user_id', user.id),
    supabase.from('journal_entries').select('*').eq('code', code).eq('user_id', user.id).order('entry_date', { ascending: false }),
  ])

  if (!watchlistItem) notFound()

  let quote = null
  let candles: Awaited<ReturnType<typeof fetchDailyCandles>> = []
  let kisError: string | null = null

  try {
    quote = await fetchQuote(code)
  } catch (e) {
    kisError = `quote: ${e instanceof Error ? e.message : String(e)}`
  }

  try {
    candles = await fetchDailyCandles(code, 300)
  } catch (e) {
    kisError = (kisError ? kisError + ' | ' : '') + `candles: ${e instanceof Error ? e.message : String(e)}`
  }

  console.error('[stock page] kisError:', kisError, 'candles.length:', candles.length)

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
      quote={quote}
      candles={candles}
      pnl={pnl}
    />
  )
}
