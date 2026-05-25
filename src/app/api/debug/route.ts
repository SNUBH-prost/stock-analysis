import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.KIS_BASE_URL ?? '(not set)'
  const hasKey = !!process.env.KIS_APP_KEY
  const hasSecret = !!process.env.KIS_APP_SECRET

  // 토큰 실제 요청 테스트
  let tokenStatus = 'not tested'
  try {
    const res = await fetch(`${baseUrl}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY ?? '',
        appsecret: process.env.KIS_APP_SECRET ?? '',
      }),
    })
    const text = await res.text()
    tokenStatus = `${res.status}: ${text.slice(0, 200)}`
  } catch (e) {
    tokenStatus = `fetch error: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    baseUrl,
    hasKey,
    hasSecret,
    tokenStatus,
  })
}
