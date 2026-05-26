'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Chart as KLineChart, OverlayTemplate, OverlayCreate, CandleType } from 'klinecharts'
import type { CandleData } from '@/types/kis'
import type { Level, Trade, Drawing } from '@/types/db'

type KLineData = { timestamp: number; open: number; high: number; low: number; close: number; volume: number }
type Timeframe = 'D' | 'W' | 'M' | '1'
type DrawTool = 'none' | 'horizontalRayLine' | 'rayLine' | 'segment' | 'parallelStraightLine' | 'fibonacciLine'
type ScaleMode = 'normal' | 'logarithm' | 'percentage'

// Anchor timestamp for horizontal overlays — predates all chart data
const EPOCH_TS = new Date('2000-01-01T09:00:00+09:00').getTime()

let sellAnnotationRegistered = false

function registerSellAnnotation(registerOverlay: <E = unknown>(template: OverlayTemplate<E>) => void) {
  if (sellAnnotationRegistered) return
  sellAnnotationRegistered = true
  registerOverlay({
    name: 'sellAnnotation',
    totalStep: 2,
    styles: { line: { style: 'dashed' } },
    createPointFigures: ({ overlay, coordinates }: { overlay: { extendData?: unknown }, coordinates: { x: number; y: number }[] }) => {
      const text = overlay.extendData != null ? String(overlay.extendData) : ''
      const startX = coordinates[0].x
      const startY = coordinates[0].y + 6
      const lineEndY = startY + 50
      const arrowEndY = lineEndY + 5
      return [
        { type: 'line', attrs: { coordinates: [{ x: startX, y: startY }, { x: startX, y: lineEndY }] }, ignoreEvent: true },
        { type: 'polygon', attrs: { coordinates: [{ x: startX, y: lineEndY }, { x: startX - 4, y: arrowEndY }, { x: startX + 4, y: arrowEndY }] }, ignoreEvent: true },
        { type: 'text', attrs: { x: startX, y: arrowEndY, text, align: 'center', baseline: 'top' }, ignoreEvent: true },
      ]
    },
  })
}

function tradeDateToTs(dateStr: string): number {
  return new Date(`${dateStr}T09:00:00+09:00`).getTime()
}

function computeHA(data: KLineData[]): KLineData[] {
  const result: KLineData[] = []
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const haClose = (d.open + d.high + d.low + d.close) / 4
    const haOpen = i === 0 ? (d.open + d.close) / 2 : (result[i - 1].open + result[i - 1].close) / 2
    result.push({ ...d, open: haOpen, high: Math.max(d.high, haOpen, haClose), low: Math.min(d.low, haOpen, haClose), close: haClose })
  }
  return result
}

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '1', label: '1분' },
  { key: 'D', label: '일' },
  { key: 'W', label: '주' },
  { key: 'M', label: '월' },
]

const DRAW_TOOLS: { key: DrawTool; icon: string; label: string }[] = [
  { key: 'none', icon: '↖', label: '포인터' },
  { key: 'horizontalRayLine', icon: '─', label: '수평선' },
  { key: 'rayLine', icon: '↗', label: '추세선' },
  { key: 'segment', icon: '╱', label: '선분' },
  { key: 'parallelStraightLine', icon: '⇈', label: '평행선' },
  { key: 'fibonacciLine', icon: 'Fib', label: '피보나치' },
]

const CANDLE_TYPES: { key: CandleType; label: string }[] = [
  { key: 'candle_solid', label: '실봉' },
  { key: 'candle_stroke', label: '속봉' },
  { key: 'ohlc', label: 'OHLC' },
  { key: 'area', label: '라인' },
]

const INDICATORS: { key: string; label: string; mainPane: boolean }[] = [
  { key: 'MA', label: 'MA', mainPane: true },
  { key: 'EMA', label: 'EMA', mainPane: true },
  { key: 'BOLL', label: 'BOLL', mainPane: true },
  { key: 'SAR', label: 'SAR', mainPane: true },
  { key: 'VOL', label: 'VOL', mainPane: false },
  { key: 'MACD', label: 'MACD', mainPane: false },
  { key: 'RSI', label: 'RSI', mainPane: false },
  { key: 'KDJ', label: 'KDJ', mainPane: false },
  { key: 'BIAS', label: 'BIAS', mainPane: false },
  { key: 'CCI', label: 'CCI', mainPane: false },
  { key: 'WR', label: 'WR', mainPane: false },
  { key: 'DMI', label: 'DMI', mainPane: false },
  { key: 'OBV', label: 'OBV', mainPane: false },
]

interface Props {
  code: string
  userId: string
  initialCandles: CandleData[]
  levels?: Level[]
  trades?: Trade[]
  avgBuyPrice?: number
  savedDrawings?: Drawing[]
}

export default function Chart({
  code, userId, initialCandles,
  levels = [], trades = [], avgBuyPrice,
  savedDrawings = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<KLineChart | null>(null)
  const isHARef = useRef(false)

  // SSR seed — latest ~100 daily candles from server
  const initialCandlesRef = useRef<KLineData[]>(initialCandles.map(c => ({ ...c })))
  // Current timeframe, read by getBars closure
  const currentTfRef = useRef<Timeframe>('D')
  // Pre-fetched data for W, M, and 1-min (stored before calling setPeriod)
  const nonDayDataRef = useRef<KLineData[]>([])
  // Full 5-year daily history built by background loader; chart reloads when ready
  const fullDailyDataRef = useRef<KLineData[]>([])
  const hasFullHistoryRef = useRef(false)

  // Refs keep latest prop values without triggering chart reinit
  const levelsRef = useRef(levels)
  const tradesRef = useRef(trades)
  const avgBuyPriceRef = useRef(avgBuyPrice)
  const savedDrawingsRef = useRef(savedDrawings)

  const [timeframe, setTimeframe] = useState<Timeframe>('D')
  const [loading, setLoading] = useState(false)
  const [drawTool, setDrawTool] = useState<DrawTool>('none')
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set())
  const [candleType, setCandleType] = useState<CandleType>('candle_solid')
  const [scaleMode, setScaleMode] = useState<ScaleMode>('normal')
  const [isHA, setIsHA] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Stable — reads from refs, never triggers chart reinit
  const refreshSystemOverlays = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.removeOverlay({ groupId: 'system' })

    for (const lv of levelsRef.current) {
      chart.createOverlay({
        name: 'horizontalRayLine',
        groupId: 'system',
        points: [{ timestamp: EPOCH_TS, value: lv.price }],
        styles: { line: { color: lv.color, size: 1, style: 'dashed', dashedValue: [4, 4] } },
      })
    }

    if (avgBuyPriceRef.current) {
      chart.createOverlay({
        name: 'simpleTag',
        groupId: 'system',
        points: [{ timestamp: EPOCH_TS, value: avgBuyPriceRef.current }],
        extendData: `평균 ${avgBuyPriceRef.current.toLocaleString()}`,
        styles: {
          line: { color: '#f59e0b', size: 1, style: 'dashed', dashedValue: [6, 3] },
          text: { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b', size: 10 },
        },
        lock: true,
      })
    }

    for (const trade of tradesRef.current) {
      const ts = tradeDateToTs(trade.trade_date)
      if (trade.side === 'BUY') {
        chart.createOverlay({
          name: 'simpleAnnotation',
          groupId: 'system',
          points: [{ timestamp: ts, value: Number(trade.price) }],
          extendData: `매수 ${Number(trade.price).toLocaleString()}`,
          styles: {
            line: { color: '#c0392b' },
            polygon: { color: '#c0392b', borderColor: '#c0392b' },
            text: { color: '#c0392b', size: 10 },
          },
        })
      } else {
        chart.createOverlay({
          name: 'sellAnnotation',
          groupId: 'system',
          points: [{ timestamp: ts, value: Number(trade.price) }],
          extendData: `매도 ${Number(trade.price).toLocaleString()}`,
          styles: {
            line: { color: '#1e5fa5' },
            polygon: { color: '#1e5fa5', borderColor: '#1e5fa5' },
            text: { color: '#1e5fa5', size: 10 },
          },
        })
      }
    }
  }, [])

  // Chart only reinits when code changes — NOT when levels/trades change
  const initChart = useCallback(async () => {
    if (!containerRef.current) return

    const { init, dispose, registerOverlay } = await import('klinecharts')
    registerSellAnnotation(registerOverlay)

    if (chartRef.current) {
      dispose(containerRef.current)
      chartRef.current = null
    }

    const chart = init(containerRef.current, {
      styles: {
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: '#c0392b', downColor: '#1e5fa5', noChangeColor: '#888888',
            upBorderColor: '#c0392b', downBorderColor: '#1e5fa5', noChangeBorderColor: '#888888',
          },
          priceMark: { last: { upColor: '#c0392b', downColor: '#1e5fa5' } },
        },
        grid: { horizontal: { color: '#1f2937' }, vertical: { color: '#1f2937' } },
        xAxis: { axisLine: { color: '#374151' }, tickText: { color: '#6b7280' } },
        yAxis: { axisLine: { color: '#374151' }, tickText: { color: '#6b7280' } },
        crosshair: {
          horizontal: { line: { color: '#374151' }, text: { backgroundColor: '#374151' } },
          vertical: { line: { color: '#374151' }, text: { backgroundColor: '#374151' } },
        },
        separator: { color: '#1f2937' },
      },
    })

    if (!chart) return
    chartRef.current = chart

    chart.setDataLoader({
      getBars: async ({ type, period, callback }) => {
        // Never load future (real-time) data
        if (type === 'backward') { callback([], false); return }

        // ── Daily ──
        if (period.type === 'day') {
          if (type === 'init') {
            // Background loader finished — serve the full dataset
            if (hasFullHistoryRef.current && fullDailyDataRef.current.length > 0) {
              const d = fullDailyDataRef.current
              callback(isHARef.current ? computeHA(d) : d, false)
              return
            }
            // SSR seed available — show immediately; background loader will reload with full history
            const seed = initialCandlesRef.current
            if (seed.length > 0) {
              callback(isHARef.current ? computeHA(seed) : seed, false)
            } else {
              // No SSR seed — fetch a single batch now
              try {
                const res = await fetch(`/api/daily/${code}?period=D`)
                const d: KLineData[] = await res.json()
                callback(Array.isArray(d) && d.length ? (isHARef.current ? computeHA(d) : d) : [], false)
              } catch { callback([], false) }
            }
          } else {
            // No manual lazy-loading — background loader fetches all history automatically
            callback([], false)
          }
          return
        }

        // ── W / M / 1min: data is pre-fetched into nonDayDataRef before setPeriod is called ──
        if (type === 'init') {
          const d = nonDayDataRef.current
          callback(isHARef.current && d.length ? computeHA(d) : d, false)
        } else {
          callback([], false)
        }
      },
    })

    chart.setSymbol({ ticker: code, pricePrecision: 0, volumePrecision: 0 })
    chart.setPeriod({ type: 'day', span: 1 })
    chart.createIndicator('VOL')

    // Restore persisted drawings
    for (const d of savedDrawingsRef.current) {
      try {
        chart.createOverlay({ ...(d.data as unknown as OverlayCreate), groupId: 'drawing' })
      } catch { /* skip malformed */ }
    }

    refreshSystemOverlays()
  }, [code, refreshSystemOverlays])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      currentTfRef.current = 'D'
      hasFullHistoryRef.current = false
      fullDailyDataRef.current = []
      setActiveIndicators(new Set(['VOL']))
      setCandleType('candle_solid')
      setScaleMode('normal')
      setTimeframe('D')

      await initChart()
      if (cancelled) return

      // ── Background: fetch full 5-year daily history ──
      // initChart used the SSR seed (~100 candles). Now silently fetch the
      // remaining batches. When done, reload the chart with the full dataset.
      const seed = initialCandlesRef.current
      if (!seed.length) return

      setLoading(true)
      let allData = [...seed]
      let oldest = allData[0].timestamp

      for (let batch = 0; batch < 13; batch++) {
        if (cancelled) return
        try {
          const res = await fetch(`/api/daily/${code}?period=D&before=${oldest}`)
          if (!res.ok || cancelled) break
          const d: KLineData[] = await res.json()
          if (!Array.isArray(d) || !d.length || cancelled) break
          allData = [...d, ...allData]
          oldest = d[0].timestamp
          if (d.length < 95) break   // reached beginning of available history
        } catch { break }
      }

      if (cancelled) return
      setLoading(false)

      if (allData.length > seed.length) {
        fullDailyDataRef.current = allData
        hasFullHistoryRef.current = true
        // Reload chart with full dataset; getBars(init) will now return allData
        chartRef.current?.setSymbol({ ticker: code, pricePrecision: 0, volumePrecision: 0 })
        refreshSystemOverlays()
      }
    }

    setup()

    return () => {
      cancelled = true
      if (containerRef.current) {
        import('klinecharts').then(({ dispose }) => {
          if (containerRef.current) dispose(containerRef.current)
        })
        chartRef.current = null
      }
    }
  }, [initChart, refreshSystemOverlays, code])

  // Sync refs → update overlays only, no chart reinit
  useEffect(() => {
    levelsRef.current = levels
    tradesRef.current = trades
    avgBuyPriceRef.current = avgBuyPrice
    refreshSystemOverlays()
  }, [levels, trades, avgBuyPrice, refreshSystemOverlays])

  const handleTimeframe = useCallback(async (tf: Timeframe) => {
    if (tf === timeframe) return
    currentTfRef.current = tf
    setTimeframe(tf)

    const chart = chartRef.current
    if (!chart) return

    // For D: just switch period — getBars handles it with SSR seed + lazy loading
    if (tf === 'D') {
      chart.setPeriod({ type: 'day', span: 1 })
      return
    }

    // For W, M, 1min: pre-fetch data BEFORE calling setPeriod so it's ready
    // when klinecharts immediately calls getBars(type='init')
    setLoading(true)
    try {
      let rawData: KLineData[]
      if (tf === '1') {
        const res = await fetch(`/api/minute/${code}`)
        rawData = await res.json()
      } else {
        const res = await fetch(`/api/daily/${code}?period=${tf}`)
        rawData = await res.json()
      }
      nonDayDataRef.current = Array.isArray(rawData) ? rawData : []
    } catch {
      nonDayDataRef.current = []
    } finally {
      setLoading(false)
    }

    if (tf === '1') chart.setPeriod({ type: 'minute', span: 1 })
    else if (tf === 'W') chart.setPeriod({ type: 'week', span: 1 })
    else chart.setPeriod({ type: 'month', span: 1 })
  }, [timeframe, code])

  const handleDrawTool = useCallback((tool: DrawTool) => {
    setDrawTool(tool)
    if (tool !== 'none' && chartRef.current) {
      chartRef.current.createOverlay({ name: tool, groupId: 'drawing' })
    }
  }, [])

  const toggleIndicator = useCallback((key: string, mainPane: boolean) => {
    const chart = chartRef.current
    if (!chart) return
    if (activeIndicators.has(key)) {
      chart.removeIndicator({ name: key })
      setActiveIndicators(prev => { const s = new Set(prev); s.delete(key); return s })
    } else {
      chart.createIndicator(key, mainPane ? { pane: { id: 'candle_pane' } } : undefined)
      setActiveIndicators(prev => new Set([...prev, key]))
    }
  }, [activeIndicators])

  const handleCandleType = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    const idx = CANDLE_TYPES.findIndex(c => c.key === candleType)
    const next = CANDLE_TYPES[(idx + 1) % CANDLE_TYPES.length].key
    chart.setStyles({ candle: { type: next } })
    setCandleType(next)
  }, [candleType])

  const handleScaleMode = useCallback((mode: ScaleMode) => {
    const chart = chartRef.current
    if (!chart) return
    const next = scaleMode === mode ? 'normal' : mode
    chart.overrideYAxis({ name: next })
    setScaleMode(next)
  }, [scaleMode])

  const toggleHA = useCallback(() => {
    isHARef.current = !isHARef.current
    setIsHA(isHARef.current)
    // setSymbol triggers getBars(type='init') which re-reads isHARef
    chartRef.current?.setSymbol({ ticker: code, pricePrecision: 0, volumePrecision: 0 })
  }, [code])

  const handleScrollToLatest = useCallback(() => {
    chartRef.current?.scrollToRealTime(300)
  }, [])

  const handleClearDrawings = useCallback(() => {
    chartRef.current?.removeOverlay({ groupId: 'drawing' })
  }, [])

  const saveDrawings = useCallback(async () => {
    const chart = chartRef.current
    if (!chart) return
    setSaveStatus('saving')
    const overlays = chart.getOverlays({ groupId: 'drawing' })
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('drawings').delete().eq('code', code).eq('user_id', userId)
    if (overlays.length > 0) {
      await supabase.from('drawings').insert(
        overlays.map(o => ({
          user_id: userId,
          code,
          type: o.name,
          data: {
            name: o.name,
            points: o.points.map(p => ({ timestamp: p.timestamp, value: p.value })),
            styles: o.styles ?? null,
            lock: o.lock ?? false,
          },
        }))
      )
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [code, userId])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const chart = chartRef.current
    if (!chart) return
    switch (e.key) {
      case 'Escape': setDrawTool('none'); break
      case 'l': case 'L':
        setScaleMode(prev => {
          const next = prev === 'logarithm' ? 'normal' : 'logarithm'
          chart.overrideYAxis({ name: next })
          return next
        })
        break
      case '+': case '=': chart.zoomAtCoordinate(1.2); break
      case '-': chart.zoomAtCoordinate(0.8); break
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const nextCandleLabel = CANDLE_TYPES[(CANDLE_TYPES.findIndex(c => c.key === candleType) + 1) % CANDLE_TYPES.length].label

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-800 flex-wrap bg-gray-900">

        {/* Timeframes */}
        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button key={tf.key} onClick={() => handleTimeframe(tf.key)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${timeframe === tf.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              {tf.label}
            </button>
          ))}
        </div>

        <div className="w-px h-3.5 bg-gray-700" />

        {/* Drawing tools */}
        <div className="flex gap-0.5">
          {DRAW_TOOLS.map(tool => (
            <button key={tool.key} onClick={() => handleDrawTool(tool.key)} title={tool.label}
              className={`px-2 py-1 text-xs rounded transition-colors ${drawTool === tool.key ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-700'}`}>
              {tool.icon}
            </button>
          ))}
          <button onClick={handleClearDrawings} title="그림 지우기"
            className="px-2 py-1 text-xs rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors">✕</button>
          <button onClick={saveDrawings} disabled={saveStatus === 'saving'} title="그림 저장 (Supabase)"
            className={`px-2 py-1 text-xs rounded transition-colors ${saveStatus === 'saved' ? 'text-green-400' : 'text-gray-600 hover:text-white hover:bg-gray-700'}`}>
            {saveStatus === 'saving' ? '…' : saveStatus === 'saved' ? '✓' : '💾'}
          </button>
        </div>

        <div className="w-px h-3.5 bg-gray-700" />

        {/* Candle / HA / scale */}
        <div className="flex gap-0.5">
          <button onClick={handleCandleType} title={`다음: ${nextCandleLabel}`}
            className="px-2 py-1 text-xs rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            {CANDLE_TYPES.find(c => c.key === candleType)?.label}
          </button>
          <button onClick={toggleHA} title="하이킨 아시"
            className={`px-2 py-1 text-xs rounded transition-colors ${isHA ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-700'}`}>
            HA
          </button>
          <button onClick={() => handleScaleMode('logarithm')} title="로그 스케일 (L)"
            className={`px-2 py-1 text-xs rounded transition-colors ${scaleMode === 'logarithm' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-700'}`}>
            Log
          </button>
          <button onClick={() => handleScaleMode('percentage')} title="등락률 스케일"
            className={`px-2 py-1 text-xs rounded transition-colors ${scaleMode === 'percentage' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-700'}`}>
            %
          </button>
          <button onClick={handleScrollToLatest} title="최신으로"
            className="px-2 py-1 text-xs rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
            →|
          </button>
        </div>

        <div className="w-px h-3.5 bg-gray-700" />

        {/* Indicators */}
        <div className="flex gap-0.5 flex-wrap">
          {INDICATORS.map(ind => (
            <button key={ind.key} onClick={() => toggleIndicator(ind.key, ind.mainPane)}
              className={`px-2 py-1 text-xs rounded transition-colors ${activeIndicators.has(ind.key) ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-700'}`}>
              {ind.label}
            </button>
          ))}
        </div>

        {loading && <span className="text-xs text-gray-500 ml-auto animate-pulse">로딩 중...</span>}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
