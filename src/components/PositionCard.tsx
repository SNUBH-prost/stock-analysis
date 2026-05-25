'use client'

import Link from 'next/link'
import type { PnlResult } from '@/lib/pnl'
import type { Watchlist } from '@/types/db'

interface Props {
  watchlist: Watchlist
  pnl: PnlResult | null
}

export default function PositionCard({ watchlist, pnl }: Props) {
  const isPositive = pnl && pnl.unrealizedPnlRate >= 0

  return (
    <Link
      href={`/stock/${watchlist.code}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-white text-sm">{watchlist.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{watchlist.code} · {watchlist.market}</p>
        </div>
        {pnl && (
          <span
            className={`text-sm font-semibold ${
              isPositive ? 'text-red-400' : 'text-blue-400'
            }`}
          >
            {isPositive ? '+' : ''}{pnl.unrealizedPnlRate.toFixed(2)}%
          </span>
        )}
      </div>

      {pnl ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">현재가</span>
            <span className="text-white">{pnl.currentPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">평균단가</span>
            <span className="text-white">{pnl.position.avgBuyPrice.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">수량</span>
            <span className="text-white">{pnl.position.quantity.toLocaleString()}주</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">평가손익</span>
            <span className={isPositive ? 'text-red-400' : 'text-blue-400'}>
              {isPositive ? '+' : ''}{pnl.unrealizedPnl.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">보유기간</span>
            <span className="text-gray-300">{pnl.daysSinceBuy}일</span>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-xs">매매 기록 없음</p>
      )}
    </Link>
  )
}
