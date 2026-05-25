import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calcPnl } from '@/lib/pnl'
import PositionCard from '@/components/PositionCard'
import AddWatchlistForm from '@/components/AddWatchlistForm'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: watchlist }, { data: trades }] = await Promise.all([
    supabase.from('watchlist').select('*').order('created_at', { ascending: false }),
    supabase.from('trades').select('*'),
  ])

  // 현재가 일괄 조회 (서버사이드 내부 API 호출 대신 직접 호출)
  const codes = [...new Set((watchlist ?? []).map(w => w.code))]
  const priceMap: Record<string, number> = {}

  if (codes.length > 0) {
    const { fetchQuote } = await import('@/lib/kis')
    await Promise.allSettled(
      codes.map(async code => {
        try {
          const data = await fetchQuote(code)
          priceMap[code] = data.price
        } catch {
          // 시세 실패 시 카드는 가격 없이 렌더
        }
      })
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-semibold">매매일지</h1>
        <form action="/auth/signout" method="post">
          <button className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            로그아웃
          </button>
        </form>
      </div>

      <div className="mb-6">
        <AddWatchlistForm userId={user.id} />
      </div>

      {(!watchlist || watchlist.length === 0) ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-sm">종목을 추가해서 시작하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map(w => {
            const stockTrades = (trades ?? []).filter(t => t.code === w.code)
            const currentPrice = priceMap[w.code]
            const pnl = currentPrice && stockTrades.length > 0
              ? calcPnl(stockTrades, currentPrice)
              : null
            return (
              <PositionCard key={w.id} watchlist={w} pnl={pnl} />
            )
          })}
        </div>
      )}
    </div>
  )
}
