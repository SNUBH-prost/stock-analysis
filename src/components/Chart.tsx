'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Chart as KLineChart, OverlayTemplate } from 'klinecharts'
import type { CandleData } from '@/types/kis'
import type { Level, Trade } from '@/types/db'

type KLineData = { timestamp: number; open: number; high: number; low: number; close: number; volume: number }
type Timeframe = 'D' | 'W' | 'M' | '1'
type DrawTool = 'none' | 'horizontalRayLine' | 'rayLine' | 'segment' | 'parallelStraightLine' | 'fibonacciLine'

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
        {
          type: 'line',
          attrs: { coordinates: [{ x: startX, y: startY }, { x: startX, y: lineEndY }] },
          ignoreEvent: true,
        },
        {
          type: 'polygon',
          attrs: { coordinates: [{ x: startX, y: lineEndY }, { x: startX - 4, y: arrowEndY }, { x: startX + 4, y: arrowEndY }] },
          ignoreEvent: true,
        },
        {
          type: 'text',
          attrs: { x: startX, y: arrowEndY, text, align: 'center', baseline: 'top' },
          ignoreEvent: true,
        },
      ]
    },
  })
}

function tradeDateToTs(dateStr: string): number {
  return new Date(`${dateStr}T09:00:00+09:00`).getTime()
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

const INDICATORS: { key: string; label: string; mainPane: boolean }[] = [
  { key: 'MA', label: 'MA', mainPane: true },
  { key: 'EMA', label: 'EMA', mainPane: true },
  { key: 'BOLL', label: 'BOLL', mainPane: true },
  { key: 'VOL', label: 'VOL', mainPane: false },
  { key: 'MACD', label: 'MACD', mainPane: false },
  { key: 'RSI', label: 'RSI', mainPane: false },
]

interface Props {
  code: string
  initialCandles: CandleData[]
  levels?: Level[]
  trades?: Trade[]
  avgBuyPrice?: number
}

export default function Chart({ code, initialCandles, levels = [], trades = [], avgBuyPrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<KLineChart | null>(null)
  const klineDataRef = useRef<KLineData[]>(initialCandles.map(c => ({ ...c })))

  const [timeframe, setTimeframe] = useState<Timeframe>('D')
  const [loading, setLoading] = useState(false)
  const [drawTool, setDrawTool] = useState<DrawTool>('none')
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set())

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
            upColor: '#c0392b',
            downColor: '#1e5fa5',
            noChangeColor: '#888888',
            upBorderColor: '#c0392b',
            downBorderColor: '#1e5fa5',
            noChangeBorderColor: '#888888',
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
      getBars: ({ callback }) => { callback(klineDataRef.current, false) },
    })
    chart.setSymbol({ ticker: code, pricePrecision: 0, volumePrecision: 0 })
    chart.setPeriod({ type: 'day', span: 1 })
    chart.createIndicator('VOL')

    for (const lv of levels) {
      if (klineDataRef.current.length === 0) break
      chart.createOverlay({
        name: 'horizontalRayLine',
        points: [{ timestamp: klineDataRef.current[0].timestamp, value: lv.price }],
        styles: { line: { color: lv.color, size: 1, style: 'dashed', dashedValue: [4, 4] } },
      })
    }

    if (avgBuyPrice && klineDataRef.current.length > 0) {
      chart.createOverlay({
        name: 'horizontalRayLine',
        points: [{ timestamp: klineDataRef.current[0].timestamp, value: avgBuyPrice }],
        styles: { line: { color: '#f59e0b', size: 1, style: 'dashed', dashedValue: [6, 3] } },
        lock: true,
      })
    }

    for (const trade of trades) {
      const ts = tradeDateToTs(trade.trade_date)
      if (trade.side === 'BUY') {
        chart.createOverlay({
          name: 'simpleAnnotation',
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
  }, [code, levels, trades, avgBuyPrice])

  useEffect(() => {
    initChart()
    setActiveIndicators(new Set(['VOL']))
    return () => {
      if (containerRef.current) {
        import('klinecharts').then(({ dispose }) => {
          if (containerRef.current) dispose(containerRef.current)
        })
        chartRef.current = null
      }
    }
  }, [initChart])

  const loadCandles = useCallback(async (tf: Timeframe) => {
    setLoading(true)
    try {
      let data: CandleData[]
      if (tf === '1') {
        const res = await fetch(`/api/minute/${code}`)
        data = await res.json()
      } else {
        const count = tf === 'M' ? 60 : tf === 'W' ? 100 : 1250
        const res = await fetch(`/api/daily/${code}?count=${count}&period=${tf}`)
        data = await res.json()
      }
      if (!Array.isArray(data) || data.length === 0) return
      klineDataRef.current = data.map(c => ({ ...c }))
      chartRef.current?.setSymbol({ ticker: code, pricePrecision: 0, volumePrecision: 0 })
    } catch (e) {
      console.error('candle fetch', e)
    } finally {
      setLoading(false)
    }
  }, [code])

  const handleTimeframe = useCallback((tf: Timeframe) => {
    if (tf === timeframe) return
    setTimeframe(tf)
    loadCandles(tf)
  }, [timeframe, loadCandles])

  const handleDrawTool = useCallback((tool: DrawTool) => {
    setDrawTool(tool)
    if (tool !== 'none' && chartRef.current) {
      chartRef.current.createOverlay({ name: tool })
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

  if (initialCandles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        시세 데이터를 가져올 수 없습니다
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 flex-wrap bg-gray-900">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.key}
              onClick={() => handleTimeframe(tf.key)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                timeframe === tf.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="w-px h-3.5 bg-gray-700" />

        <div className="flex gap-0.5">
          {DRAW_TOOLS.map(tool => (
            <button
              key={tool.key}
              onClick={() => handleDrawTool(tool.key)}
              title={tool.label}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                drawTool === tool.key
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-500 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-3.5 bg-gray-700" />

        <div className="flex gap-0.5">
          {INDICATORS.map(ind => (
            <button
              key={ind.key}
              onClick={() => toggleIndicator(ind.key, ind.mainPane)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeIndicators.has(ind.key)
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-500 hover:text-white hover:bg-gray-700'
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>

        {loading && (
          <span className="text-xs text-gray-600 ml-auto animate-pulse">로딩 중...</span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
