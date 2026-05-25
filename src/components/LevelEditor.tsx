'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Level } from '@/types/db'

interface Props {
  code: string
  userId: string
  levels: Level[]
  onRefresh: () => void
}

const PRESET_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6']

export default function LevelEditor({ code, userId, levels, onRefresh }: Props) {
  const [price, setPrice] = useState('')
  const [label, setLabel] = useState<'support' | 'resistance' | string>('support')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [loading, setLoading] = useState(false)

  async function addLevel(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('levels').insert({
      user_id: userId,
      code,
      price: Number(price),
      label,
      color,
    })
    setPrice('')
    onRefresh()
    setLoading(false)
  }

  async function deleteLevel(id: string) {
    const supabase = createClient()
    await supabase.from('levels').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addLevel} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              min={0}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">구분</label>
            <select
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="support">지지선</option>
              <option value="resistance">저항선</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c ? 'scale-125 ring-2 ring-white/40' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-800 text-white rounded-lg py-2 text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          추가
        </button>
      </form>

      {levels.length > 0 && (
        <div className="space-y-1.5">
          {levels.map(lv => (
            <div
              key={lv.id}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lv.color }} />
                <span className="text-xs text-gray-300">
                  {lv.price.toLocaleString()}원
                </span>
                <span className="text-xs text-gray-500">
                  {lv.label === 'support' ? '지지' : lv.label === 'resistance' ? '저항' : lv.label}
                </span>
              </div>
              <button
                onClick={() => deleteLevel(lv.id)}
                className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
