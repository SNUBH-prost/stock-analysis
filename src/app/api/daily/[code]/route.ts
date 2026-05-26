import { NextRequest, NextResponse } from 'next/server'
import { fetchDailyCandles } from '@/lib/kis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '유효한 6자리 종목코드를 입력하세요' }, { status: 400 })
  }

  const periodParam = request.nextUrl.searchParams.get('period')
  const period = (['D', 'W', 'M'] as const).includes(periodParam as 'D' | 'W' | 'M')
    ? (periodParam as 'D' | 'W' | 'M')
    : 'D'

  const beforeParam = request.nextUrl.searchParams.get('before')
  const beforeTs = beforeParam ? parseInt(beforeParam, 10) : undefined

  try {
    const candles = await fetchDailyCandles(code, period, beforeTs)
    return NextResponse.json(candles)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
