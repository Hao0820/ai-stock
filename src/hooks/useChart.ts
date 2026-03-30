import { useState, useEffect, useRef, useTransition } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, Time } from 'lightweight-charts';
import { ProcessedChartData, StockDetailResult } from '../api/yahoo';

export type Resolution = 'D' | 'W' | 'M';

interface UseChartProps {
  stockDetail: StockDetailResult | null;
  candleColorStyle: 'red-up' | 'green-up';
  isSwitchingRes: boolean;
  isPending: boolean;
  t: (key: string) => string;
}

export function useChart({
  stockDetail,
  candleColorStyle,
  isSwitchingRes,
  isPending,
  t
}: UseChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const kdChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);

  const [tooltipData, setTooltipData] = useState<ProcessedChartData | null>(null);
  const [chartDebugError, setChartDebugError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockDetail || !stockDetail.chartData || stockDetail.chartData.length === 0) return;
    if (!mainChartRef.current || !rsiChartRef.current || !kdChartRef.current || !macdChartRef.current) return;
    if (isSwitchingRes || isPending) return;

    const isUpToday = stockDetail.changeValue >= 0;
    let isUpColorHex = '#ef4444'; // Red
    let isDownColorHex = '#22c55e'; // Green

    if (candleColorStyle === 'green-up') {
      isUpColorHex = '#22c55e';
      isDownColorHex = '#ef4444';
    }

    try {
      const chartOptions: any = {
        layout: { 
          background: { type: ColorType.Solid, color: 'transparent' }, 
          textColor: '#cbd5e1', 
          fontSize: 13 
        },
        grid: { 
          vertLines: { color: 'rgba(255,255,255,0.05)' }, 
          horzLines: { color: 'rgba(255,255,255,0.03)' } 
        },
        crosshair: { 
          mode: CrosshairMode.Normal, 
          vertLine: { color: 'rgba(255,255,255,0.4)', width: 1, style: LineStyle.Dashed }, 
          horzLine: { color: 'rgba(255,255,255,0.4)', width: 1, style: LineStyle.Dashed } 
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
          minimumWidth: 80,
        },
        timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      };

      // Initialize Charts
      const mainChart = createChart(mainChartRef.current, { ...chartOptions });
      const rsiChart = createChart(rsiChartRef.current, { ...chartOptions });
      const kdChart = createChart(kdChartRef.current, { ...chartOptions });
      const macdChart = createChart(macdChartRef.current, { ...chartOptions });

      // Align Horizontal Scaling
      rsiChart.timeScale().applyOptions({ visible: false });
      kdChart.timeScale().applyOptions({ visible: false });
      mainChart.timeScale().applyOptions({ visible: false });

      // Prepare Data
      const data = stockDetail.chartData.map(d => ({ ...d, time: d.originalTimestamp as Time }))
        .sort((a, b) => (a.time as number) - (b.time as number));
        
      const uniqueDataMap = new Map();
      data.forEach(d => uniqueDataMap.set(d.time, d));
      const uniqueData = Array.from(uniqueDataMap.values()).sort((a, b) => (a.time as number) - (b.time as number));

      // Series Setup
      // MAIN: Candlesticks
      const candleSeries = mainChart.addCandlestickSeries({ 
        upColor: isUpColorHex, 
        downColor: isDownColorHex, 
        borderVisible: false, 
        wickUpColor: isUpColorHex, 
        wickDownColor: isDownColorHex, 
        lastValueVisible: false, 
        priceLineVisible: false 
      });
      candleSeries.setData(uniqueData.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));

      // MAIN: MAs
      const ma5Series = mainChart.addLineSeries({ color: '#eab308', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
      ma5Series.setData(uniqueData.filter(d => d.ma5 !== null).map(d => ({ time: d.time, value: d.ma5! })));
      const ema12Series = mainChart.addLineSeries({ color: '#3b82f6', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
      ema12Series.setData(uniqueData.filter(d => d.ema12 !== null).map(d => ({ time: d.time, value: d.ema12! })));

      const bbUpperSeries = mainChart.addLineSeries({ color: 'rgba(255,255,255,0.3)', lineStyle: LineStyle.Dashed, lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
      bbUpperSeries.setData(uniqueData.filter(d => d.bbUpper !== null).map(d => ({ time: d.time, value: d.bbUpper! })));
      const bbLowerSeries = mainChart.addLineSeries({ color: 'rgba(255,255,255,0.3)', lineStyle: LineStyle.Dashed, lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
      bbLowerSeries.setData(uniqueData.filter(d => d.bbLower !== null).map(d => ({ time: d.time, value: d.bbLower! })));

      // RSI
      const rsiSeries = rsiChart.addLineSeries({ color: '#c084fc', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
      rsiSeries.setData(uniqueData.filter(d => d.rsi14 !== null).map(d => ({ time: d.time, value: d.rsi14! })));
      rsiSeries.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });

      // KD
      const kSeries = kdChart.addLineSeries({ color: '#fb923c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
      kSeries.setData(uniqueData.filter(d => d.k9 !== null).map(d => ({ time: d.time, value: d.k9! })));
      const dSeries = kdChart.addLineSeries({ color: '#38bdf8', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
      dSeries.setData(uniqueData.filter(d => d.d9 !== null).map(d => ({ time: d.time, value: d.d9! })));
      kSeries.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });

      // MACD
      const macdSeries = macdChart.addLineSeries({ color: '#e11d48', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
      macdSeries.setData(uniqueData.filter(d => d.macdLine !== null).map(d => ({ time: d.time, value: d.macdLine! })));
      const signalSeries = macdChart.addLineSeries({ color: '#0d9488', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
      signalSeries.setData(uniqueData.filter(d => d.macdSignal !== null).map(d => ({ time: d.time, value: d.macdSignal! })));
      const histogramSeries = macdChart.addHistogramSeries({ color: '#ef4444', lastValueVisible: false, priceLineVisible: false });
      histogramSeries.setData(uniqueData.filter(d => d.macdHist !== null).map(d => ({
        time: d.time,
        value: d.macdHist!,
        color: d.macdHist! >= 0 ? isUpColorHex : isDownColorHex
      })));

      const charts = [mainChart, rsiChart, kdChart, macdChart];

      // Final View Setup
      mainChart.timeScale().fitContent();
      const lastIndex = uniqueData.length;
      mainChart.timeScale().setVisibleLogicalRange({
        from: lastIndex - 30,
        to: lastIndex + 2,
      });

      let isSyncing = false;

      const syncCharts = (sourceChart: IChartApi, handlerName: 'subscribeVisibleTimeRangeChange' | 'subscribeCrosshairMove', dataProp: any) => {
        if (isSyncing) return;
        isSyncing = true;
        charts.forEach(targetChart => {
          if (targetChart !== sourceChart) {
            if (handlerName === 'subscribeVisibleTimeRangeChange') {
              targetChart.timeScale().setVisibleRange(dataProp);
            } else if (handlerName === 'subscribeCrosshairMove') {
              if (dataProp.time) {
                targetChart.setCrosshairPosition(dataProp.price, dataProp.time, getFirstSeries(targetChart));
              } else {
                targetChart.clearCrosshairPosition();
              }
            }
          }
        });
        isSyncing = false;
      };

      const getFirstSeries = (chart: IChartApi): any => {
        if (chart === mainChart) return candleSeries;
        if (chart === rsiChart) return rsiSeries;
        if (chart === kdChart) return kSeries;
        if (chart === macdChart) return histogramSeries;
      };

      charts.forEach(chart => {
        chart.timeScale().subscribeVisibleTimeRangeChange(range => {
          if (range) syncCharts(chart, 'subscribeVisibleTimeRangeChange', range);
        });
        chart.subscribeCrosshairMove(param => {
          if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
            setTooltipData(null);
            syncCharts(chart, 'subscribeCrosshairMove', { time: null });
          } else {
            const matchedData = uniqueData.find(d => d.time === param.time);
            if (matchedData) setTooltipData(matchedData as ProcessedChartData);

            let yPrice = param.seriesData.get(getFirstSeries(chart));
            let resolvedPrice = 0;
            if (yPrice) {
              if (typeof yPrice === 'number') resolvedPrice = yPrice;
              else if ('value' in yPrice) resolvedPrice = (yPrice as any).value;
              else if ('close' in yPrice) resolvedPrice = (yPrice as any).close;
            }
            syncCharts(chart, 'subscribeCrosshairMove', { time: param.time, price: resolvedPrice });
          }
        });
      });

      const handleResize = () => {
        if (!mainChartRef.current) return;
        charts.forEach((c, idx) => {
          const container = [mainChartRef, rsiChartRef, kdChartRef, macdChartRef][idx].current;
          if (container) c.applyOptions({ width: container.clientWidth });
        });
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        charts.forEach(c => c.remove());
      };
    } catch (err: any) {
      console.error('Chart error:', err);
      setChartDebugError(err.toString());
    }
  }, [stockDetail, candleColorStyle, isSwitchingRes, isPending]);

  return {
    refs: {
      mainChartRef,
      rsiChartRef,
      kdChartRef,
      macdChartRef,
    },
    tooltipData,
    chartDebugError,
  };
}
