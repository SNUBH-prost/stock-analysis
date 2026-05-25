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
  const [label, setLabel] = useState<string>('support')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')

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

  function startEdit(lv: Level) {
    setEditingId(lv.id)
    setEditPrice(String(lv.price))
    setEditLabel(lv.label)
    setEditColor(lv.color)
  }

  async function saveEdit(id: string) {
    const supabase = createClient()
    await supabase.from('levels').update({
      price: Number(editPrice),
      label: editLabel,
      color: editColor,
    }).eq('id', id)
    setEditingId(null)
    onRefresh()
  }

  async function deleteLevel(id: string) {
    const supabase = createClient()
    await supabase.from('levels').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addLevel} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              min={0}
              placeholder="87500"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">구분</label>
            <select
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-gray-500"
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
              className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/40' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !price}
          className="w-full bg-gray-800 text-white rounded px-3 py-1.5 text-xs hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          추가
        </button>
      </form>

      {levels.length > 0 && (
        <div className="space-y-1.5">
          {levels.map(lv => (
            <div key={lv.id} className="bg-gray-800/50 rounded px-2 py-1.5">
              {editingId === lv.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editPrice}
                      onChange={e => setEditPrice(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none"
                    />
                    <select
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none"
                    >
                      <option value="support">지지선</option>
                      <option value="resistance">저항선</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-white/40' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => saveEdit(lv.id)} className="text-xs text-green-400 hover:text-green-300 transition-colors">저장</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">취소</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lv.color }} />
                    <span className="text-xs text-gray-300">{Number(lv.price).toLocaleString()}원</span>
                    <span className="text-xs text-gray-500">
                      {lv.label === 'support' ? '지지' : lv.label === 'resistance' ? '저항' : lv.label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(lv)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">수정</button>
                    <button onClick={() => deleteLevel(lv.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
