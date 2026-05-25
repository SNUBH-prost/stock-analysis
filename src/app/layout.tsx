import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '매매일지',
  description: '기술적 차트 분석 기반 개인 매매일지',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-950 text-white antialiased min-h-screen">{children}</body>
    </html>
  )
}
