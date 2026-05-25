# Trading Journal (매매일지)

기술적 차트 분석 기반 개인 매매일지 웹앱. 종목별 매수 타점, 지지/저항선, 추세선, 손익률 자동 계산을 한곳에서 관리.

---

## Tech Stack

- **Next.js 16+** (App Router, TypeScript strict, Server Components 기본)
- **Vercel** — 호스팅, GitHub 연동 자동 배포
- **Supabase** — DB (PostgreSQL) + Auth (Magic Link) + RLS
- **KIS Developers API** — 시세 데이터 (한국투자증권 정식 API)
- **klinecharts** — 캔들차트, 차트 위 추세선/수평선/박스 그리기 도구 내장, 보조지표 30+
- **technicalindicators** (npm) — 보조지표 계산 보조
- **Tailwind CSS v4**

---

## 1차 범위 (이번 사이클)

- 한국 주식 + 한국 상장 ETF (둘 다 6자리 종목코드, KIS 국내주식 API 동일 엔드포인트로 처리)
- S&P 500 ETF는 한국 상장 KODEX/TIGER 미국S&P500 형태로 1차 범위에 포함

## 2차 범위 (나중)

- 미국 직상장 주식 (AAPL, NVDA 등) — KIS 해외시세 API 별도 엔드포인트
- 종목 자동 모니터링/알림 (이평선 돌파, RSI 과매수 등)

---

## 핵심 기능

1. **대시보드** — 보유 종목 카드 그리드 (현재가, 매수가, 손익률, 매수 후 경과일)
2. **종목 상세 페이지**
   - 캔들차트 (일봉 기본, 분봉 토글)
   - 지지선/저항선 (사용자 입력, 차트에 dashed line)
   - 매수/매도 타점 마커 (가격 + 날짜)
   - 추세선/박스/피보나치 직접 그리기 → DB 저장 → 다음 방문 시 복원
   - 보조지표 토글 (MA, EMA, MACD, RSI, BOLL, VOL)
   - 매매 기록 테이블 (해당 종목)
   - 매매 일지 메모 (왜 샀는지, 시나리오, 회고)
3. **매매 추가** — 매수/매도 폼 (가격, 수량, 날짜, 메모)
4. **손익률 자동 계산** — 현재가 기준, FIFO 평균 매수가
5. **인증** — Supabase Magic Link (이메일 한 통), RLS로 본인 데이터 격리

---

## 데이터 모델 (Supabase)

```sql
-- 관심 종목 / 보유 종목
watchlist (
  id uuid pk,
  user_id uuid fk auth.users,
  code text,         -- 6자리 종목코드
  name text,         -- 종목명
  market text,       -- 'KOSPI' | 'KOSDAQ' | 'ETF'
  created_at timestamp
)

-- 매매 기록
trades (
  id uuid pk,
  user_id uuid fk,
  code text,
  trade_date date,
  side text,         -- 'BUY' | 'SELL'
  price numeric,
  quantity integer,
  memo text,
  created_at timestamp
)

-- 지지/저항선
levels (
  id uuid pk,
  user_id uuid fk,
  code text,
  price numeric,
  label text,        -- 'support' | 'resistance' | 자유 라벨
  color text,
  created_at timestamp
)

-- 차트 그림 (추세선, 박스, 피보나치 등)
drawings (
  id uuid pk,
  user_id uuid fk,
  code text,
  type text,         -- 'trendline' | 'box' | 'fibonacci' | ...
  data jsonb,        -- klinecharts overlay 좌표/설정
  created_at timestamp
)

-- 매매 일지 메모 (종목별 일자별 자유 메모)
journal_entries (
  id uuid pk,
  user_id uuid fk,
  code text,
  entry_date date,
  content text,
  created_at timestamp
)
```

모든 테이블에 RLS 정책: `user_id = auth.uid()`로 본인 데이터만 SELECT/INSERT/UPDATE/DELETE 가능.

---

## 환경 변수 (.env.local 및 Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 서버에서만 사용
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ACCOUNT_NO=               # 8자리-2자리 형식
KIS_BASE_URL=https://openapivts.koreainvestment.com:29443  # 모의투자
```

KIS 실전계좌 베이스 URL은 `https://openapi.koreainvestment.com:9443` (1차에선 모의로 시작).

---

## 디렉토리 구조

```
src/
  app/
    page.tsx                          # 대시보드
    stock/[code]/page.tsx             # 종목 상세
    login/page.tsx                    # Magic Link
    api/
      quote/route.ts                  # 현재가 (KIS 프록시)
      daily/[code]/route.ts           # 일봉
      minute/[code]/route.ts          # 분봉
  lib/
    kis.ts                            # KIS API 클라이언트 (토큰 자동 갱신/캐시)
    supabase/
      client.ts                       # 브라우저용
      server.ts                       # 서버 컴포넌트용
    indicators.ts                     # 보조지표 wrapper
    pnl.ts                            # 손익률 계산 (FIFO)
  components/
    Chart.tsx                         # klinecharts 래퍼 ("use client")
    TradeForm.tsx                     # 매매 추가
    PositionCard.tsx                  # 보유 종목 카드
    LevelEditor.tsx                   # 지지/저항선 편집
    DrawingsManager.tsx               # 차트 그림 저장/복원
  types/
    db.ts                             # Supabase generated types
    kis.ts                            # KIS API 응답 타입
```

---

## KIS API 핵심 노트

- OAuth 토큰: `/oauth2/tokenP` → access_token 유효 24h. 토큰은 메모리(또는 Supabase 단일 row)에 캐싱, 만료 1시간 전 자동 갱신
- Rate limit: 모의 1초 2건, 실전 1초 20건 → 서버사이드에서만 호출, 클라이언트 캐싱 필수 (SWR 또는 Next.js fetch revalidate)
- 주요 엔드포인트
  - 현재가: `FHKST01010100` (`/uapi/domestic-stock/v1/quotations/inquire-price`)
  - 일봉: `FHKST03010100` (`/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`)
  - 분봉: `FHKST03010200` (`/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice`)
- `tr_id`는 시세 조회는 모의/실전 동일, 주문은 다름 (이번엔 시세만)
- API 호출 시 헤더에 `appkey`, `appsecret`, `authorization: Bearer <token>` 필수

---

## 코딩 규칙

- TypeScript strict, `any` 금지
- Server Components 기본, `"use client"`는 차트/폼/그리기 같은 인터랙티브 컴포넌트에만
- KIS API 호출은 무조건 `src/app/api/**` 또는 Server Action에서만 (APP SECRET 클라이언트 노출 금지)
- Supabase는 server client (cookies 기반) 우선, 클라이언트 사이드는 anon key
- 모든 KIS 응답은 zod로 런타임 검증 후 타입 좁히기
- 한국 캔들 색상 컨벤션: 빨강(`#c0392b`) = 상승, 파랑(`#1e5fa5`) = 하락 — klinecharts 스타일 객체에 명시
- 손익률 계산: `(currentPrice - avgBuyPrice) / avgBuyPrice * 100`, 평균 매수가는 FIFO 기반 (부분 매도 대응)

---

## 진행 상태

- [x] 스택 결정 (Next.js + Vercel + Supabase + KIS + klinecharts)
- [x] 1차/2차 범위 결정
- [ ] KIS Developers 가입 (모의계좌 + APP KEY/SECRET 발급)
- [ ] Supabase 프로젝트 생성 (region: Northeast Asia/Seoul)
- [ ] GitHub 리포 생성
- [ ] `create-next-app` 셋업 (TypeScript strict, Tailwind, App Router)
- [ ] Supabase 클라이언트 + Auth (Magic Link) 셋업
- [ ] Supabase 테이블 생성 + RLS 정책
- [ ] KIS API 클라이언트 (`lib/kis.ts`) — 토큰 발급/캐싱/갱신
- [ ] 시세 API 라우트 (현재가, 일봉, 분봉)
- [ ] 대시보드 페이지 (보유 종목 카드 그리드)
- [ ] 종목 상세 페이지 + klinecharts 통합
- [ ] 매매 기록 CRUD
- [ ] 지지/저항선 + 추세선 그리기 저장/복원
- [ ] 보조지표 토글
- [ ] Vercel 배포 + 환경변수
- [ ] (2차) 미국 직상장 주식 KIS 해외시세 API 통합

---

## 작업 시작 시 첫 명령

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-import-alias --turbopack
```

그 다음:
```bash
npm install @supabase/supabase-js @supabase/ssr klinecharts technicalindicators zod
```

---

## 사용자 컨텍스트

- 서준 (R1, SNUBH 보철과), Node.js + React + Python 경험
- 클리니컬 도구를 자체 제작하는 패턴 (EMR 추출 React 툴, 사전 브리핑 도구, Node.js 논문 요약 워크플로우)
- 한국 ETF + S&P 500 ETF 관심
- 솔직한 트레이드오프 설명 선호 (포장된 추천보다 한계를 같이 말해주기)
- 다크 모드 + 미니멀 디자인 선호 (예: dental_english_phrasebook 스타일)
