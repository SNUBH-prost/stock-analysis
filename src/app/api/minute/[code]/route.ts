import { NextRequest, NextResponse } from 'next/server'
import { fetchMinuteCandles } from '@/lib/kis'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '유효한 6자리 종목코드를 입력하세요' }, { status: 400 })
  }

  try {
    const candles = await fetchMinuteCandles(code)
    return NextResponse.json(candles)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
