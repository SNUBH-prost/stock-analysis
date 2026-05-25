export type Market = 'KOSPI' | 'KOSDAQ' | 'ETF'
export type TradeSide = 'BUY' | 'SELL'
export type LevelLabel = 'support' | 'resistance' | string
export type DrawingType = 'trendline' | 'box' | 'fibonacci' | 'horizontal' | string

export type Watchlist = {
  id: string
  user_id: string
  code: string
  name: string
  market: Market
  created_at: string
}

export type Trade = {
  id: string
  user_id: string
  code: string
  trade_date: string
  side: TradeSide
  price: number
  quantity: number
  memo: string | null
  created_at: string
}

export type Level = {
  id: string
  user_id: string
  code: string
  price: number
  label: LevelLabel
  color: string
  created_at: string
}

export type Drawing = {
  id: string
  user_id: string
  code: string
  type: DrawingType
  data: Record<string, unknown>
  created_at: string
}

export type JournalEntry = {
  id: string
  user_id: string
  code: string
  entry_date: string
  content: string
  created_at: string
}

// Supabase CLI 생성 형식과 동일하게 맞춤
export type Database = {
  public: {
    Tables: {
      watchlist: {
        Row: Watchlist
        Insert: Omit<Watchlist, 'id' | 'created_at'>
        Update: Partial<Omit<Watchlist, 'id' | 'user_id' | 'created_at'>>
        Relationships: never[]
      }
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at'>
        Update: Partial<Omit<Trade, 'id' | 'user_id' | 'created_at'>>
        Relationships: never[]
      }
      levels: {
        Row: Level
        Insert: Omit<Level, 'id' | 'created_at'>
        Update: Partial<Omit<Level, 'id' | 'user_id' | 'created_at'>>
        Relationships: never[]
      }
      drawings: {
        Row: Drawing
        Insert: Omit<Drawing, 'id' | 'created_at'>
        Update: Partial<Omit<Drawing, 'id' | 'user_id' | 'created_at'>>
        Relationships: never[]
      }
      journal_entries: {
        Row: JournalEntry
        Insert: Omit<JournalEntry, 'id' | 'created_at'>
        Update: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>>
        Relationships: never[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
