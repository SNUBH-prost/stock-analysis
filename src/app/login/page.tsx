'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'magic'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMsg({ ok: false, text: error.message })
      } else {
        window.location.href = '/'
        return
      }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMsg({ ok: false, text: error.message })
      } else {
        setMsg({ ok: true, text: '가입 완료. 이메일 인증 후 로그인하세요.' })
        setMode('signin')
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setMsg({ ok: false, text: error.message })
      } else {
        setMsg({ ok: true, text: `${email}로 링크를 보냈습니다.` })
      }
    }
    setLoading(false)
  }

  const title = mode === 'signin' ? '로그인' : mode === 'signup' ? '회원가입' : '이메일 링크'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-white mb-1">매매일지</h1>
        <p className="text-gray-400 text-sm mb-6">{title}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일"
            required
            autoComplete="email"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 text-sm"
          />
          {mode !== 'magic' && (
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 text-sm"
            />
          )}

          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-gray-950 rounded-lg px-4 py-3 font-medium text-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loading ? '처리 중...' : title}
          </button>
        </form>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          {mode !== 'signin' && (
            <button onClick={() => { setMode('signin'); setMsg(null) }} className="hover:text-gray-300 transition-colors">
              로그인
            </button>
          )}
          {mode !== 'signup' && (
            <button onClick={() => { setMode('signup'); setMsg(null) }} className="hover:text-gray-300 transition-colors">
              회원가입
            </button>
          )}
          <button
            onClick={() => { setMode(mode === 'magic' ? 'signin' : 'magic'); setMsg(null) }}
            className="ml-auto hover:text-gray-300 transition-colors"
          >
            {mode === 'magic' ? '← 비밀번호로' : '이메일 링크로'}
          </button>
        </div>
      </div>
    </div>
  )
}
