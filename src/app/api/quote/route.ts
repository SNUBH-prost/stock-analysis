import { NextRequest, NextResponse } from 'next/server'
import { fetchQuote } from '@/lib/kis'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '유효한 6자리 종목코드를 입력하세요' }, { status: 400 })
  }

  try {
    const data = await fetchQuote(code)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
