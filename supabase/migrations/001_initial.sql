-- 관심/보유 종목
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  code text not null,
  name text not null,
  market text not null check (market in ('KOSPI', 'KOSDAQ', 'ETF')),
  created_at timestamptz default now()
);

-- 매매 기록
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  code text not null,
  trade_date date not null,
  side text not null check (side in ('BUY', 'SELL')),
  price numeric not null,
  quantity integer not null,
  memo text,
  created_at timestamptz default now()
);

-- 지지/저항선
create table if not exists levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  code text not null,
  price numeric not null,
  label text not null default 'support',
  color text not null default '#ef4444',
  created_at timestamptz default now()
);

-- 차트 그림
create table if not exists drawings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  code text not null,
  type text not null,
  data jsonb not null default '{}',
  created_at timestamptz default now()
);

-- 매매 일지
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  code text not null,
  entry_date date not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table watchlist enable row level security;
alter table trades enable row level security;
alter table levels enable row level security;
alter table drawings enable row level security;
alter table journal_entries enable row level security;

-- RLS 정책: 본인 데이터만
create policy "watchlist_owner" on watchlist using (user_id = auth.uid());
create policy "trades_owner" on trades using (user_id = auth.uid());
create policy "levels_owner" on levels using (user_id = auth.uid());
create policy "drawings_owner" on drawings using (user_id = auth.uid());
create policy "journal_owner" on journal_entries using (user_id = auth.uid());
