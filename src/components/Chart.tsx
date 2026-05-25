'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Chart as KLineChart } from 'klinecharts'
import type { CandleData } from '@/types/kis'
import type { Level } from '@/types/db'

interface Props {
  candles: CandleData[]
  levels?: Level[]
}

export default function Chart({ candles, levels = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<KLineChart | null>(null)

  const initChart = useCallback(async () => {
    if (!containerRef.current || candles.length === 0) return

    const { init, dispose } = await import('klinecharts')

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
          priceMark: {
            last: {
              upColor: '#c0392b',
              downColor: '#1e5fa5',
            },
          },
        },
        grid: {
          horizontal: { color: '#1f2937' },
          vertical: { color: '#1f2937' },
        },
        xAxis: { axisLine: { color: '#374151' }, tickText: { color: '#6b7280' } },
        yAxis: { axisLine: { color: '#374151' }, tickText: { color: '#6b7280' } },
        crosshair: {
          horizontal: {
            line: { color: '#374151' },
            text: { backgroundColor: '#374151' },
          },
          vertical: {
            line: { color: '#374151' },
            text: { backgroundColor: '#374151' },
          },
        },
        separator: { color: '#1f2937' },
      },
    })

    if (!chart) return
    chartRef.current = chart

    const klineData = candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }))

    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(klineData, false)
      },
    })

    // 지지/저항선 수평 오버레이
    for (const lv of levels) {
      chart.createOverlay({
        name: 'horizontalRayLine',
        points: [{ timestamp: candles[0].timestamp, value: lv.price }],
        styles: {
          line: { color: lv.color, size: 1, style: 'dashed', dashedValue: [4, 4] },
        },
      })
    }
  }, [candles, levels])

  useEffect(() => {
    initChart()
    return () => {
      if (containerRef.current) {
        import('klinecharts').then(({ dispose }) => {
          if (containerRef.current) dispose(containerRef.current)
        })
        chartRef.current = null
      }
    }
  }, [initChart])

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400 }} />
}
