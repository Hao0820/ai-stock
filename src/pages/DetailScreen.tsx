import React, { useState, useEffect, useRef, useTransition, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, BarChart3, BrainCircuit, Clock, Target, Rocket, Globe, ShieldAlert, Loader2, Settings } from 'lucide-react';
import { fetchStockDetail, StockDetailResult, ProcessedChartData } from '../api/yahoo';
import { analyzeStock } from '../api/ai';
import { useTranslation } from '../contexts/LanguageContext';
import { getCachedStockData, setCachedStockData } from '../utils/cache';
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, Time, SeriesMarker } from 'lightweight-charts';
import { AIAnalysis } from '../types';

// --- Main Detail Screen ---
type Resolution = 'D' | 'W' | 'M';

export function DetailScreen({ 
  stock, 
  onBack, 
  onSettingsClick, 
  initialName, 
  candleColorStyle = 'red-up',
  apiKeys,
  selectedModel,
  subModel
}: { 
  stock: string, 
  onBack: () => void, 
  onSettingsClick: () => void, 
  initialName?: string, 
  candleColorStyle?: 'red-up' | 'green-up',
  apiKeys: { google: string, openai: string, claude: string },
  selectedModel: string,
  subModel: string
}) {
  const { t, language } = useTranslation();
  const [aiTab, setAiTab] = useState<'short' | 'medium' | 'long'>('short');
  const [activeRes, setActiveRes] = useState<Resolution>('D'); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Transition and local loading state for UI responsiveness
  const [isPending, startTransition] = useTransition();
  const [isSwitchingRes, setIsSwitchingRes] = useState(false);
  
  const [dataStore, setDataStore] = useState<Record<Resolution, StockDetailResult | null>>({
    D: null,
    W: null,
    M: null
  });

  // Chart Container Refs
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const kdChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);
  
  // Custom Floating Tooltip State
  const [tooltipData, setTooltipData] = useState<ProcessedChartData | null>(null);
  const [chartDebugError, setChartDebugError] = useState<string | null>(null);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      // Check cache first for each resolution
      const cachedD = getCachedStockData(stock, '2y', '1d');
      const cachedW = getCachedStockData(stock, '10y', '1wk');
      const cachedM = getCachedStockData(stock, 'max', '1mo');

      if (cachedD && cachedW && cachedM) {
        if (isMounted) {
          setDataStore({ D: cachedD, W: cachedW, M: cachedM });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const [resD, resW, resM] = await Promise.all([
          fetchStockDetail(stock, '2y', '1d', language),
          fetchStockDetail(stock, '10y', '1wk', language),
          fetchStockDetail(stock, 'max', '1mo', language)
        ]);

        if (isMounted) {
          setDataStore({ D: resD, W: resW, M: resM });
          
          // Save to cache
          if (resD) setCachedStockData(stock, '2y', '1d', resD);
          if (resW) setCachedStockData(stock, '10y', '1wk', resW);
          if (resM) setCachedStockData(stock, 'max', '1mo', resM);
          
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        if (isMounted) setIsLoading(false);
      }
    }
    loadAllData();
    return () => { isMounted = false; };
  }, [stock]);

  const handleResChange = (newRes: Resolution) => {
    if (newRes === activeRes) return;
    setIsSwitchingRes(true);
    // Give browser time to paint the loading spinner
    setTimeout(() => {
      startTransition(() => {
        setActiveRes(newRes);
        setIsSwitchingRes(false);
      });
    }, 10);
  };

  const dailyDetail = dataStore.D;
  const stockDetail = dataStore[activeRes];

  // AI triggering effect
  useEffect(() => {
    if (!dailyDetail || aiAnalysis || isAiLoading || aiError) return;
    
    const key = apiKeys[selectedModel as keyof typeof apiKeys];
    if (!key) {
        setAiError('Missing API Key in settings');
        return;
    }

    async function runAnalysis() {
        setIsAiLoading(true);
        setAiError(null);
        try {
            // Get the latest data point indicators
            const latest = dailyDetail!.chartData[dailyDetail!.chartData.length - 1];
            const result = await analyzeStock(
                stock,
                dailyDetail!.name,
                dailyDetail!.price,
                dailyDetail!.changePercent,
                latest,
                key,
                subModel,
                language
            );
            setAiAnalysis(result);
        } catch (err: any) {
            setAiError(err.message || 'AI Analysis failed');
        } finally {
            setIsAiLoading(false);
        }
    }

    runAnalysis();
  }, [dailyDetail, apiKeys, selectedModel, subModel, stock, language]);

  // Use daily data for the main price display to satisfy "percentage shouldn't change with resolution"
  const displayPrice = dailyDetail?.price;
  const displayChange = dailyDetail?.changeValue;
  const displayPercent = dailyDetail?.changePercent;
  const isUpToday = displayChange !== undefined ? displayChange >= 0 : true;
  
  let isUpColor = isUpToday ? 'text-red-500' : 'text-green-500'; 
  let isUpColorHex = '#ef4444'; // Red
  let isDownColorHex = '#22c55e'; // Green
  
  if (candleColorStyle === 'green-up') {
    isUpColor = isUpToday ? 'text-green-500' : 'text-red-500';
    isUpColorHex = '#22c55e';
    isDownColorHex = '#ef4444';
  }

  // Effect to handle lightweight-charts initialization and syncing
  useEffect(() => {
    if (!stockDetail || !stockDetail.chartData || stockDetail.chartData.length === 0) return;
    if (!mainChartRef.current || !rsiChartRef.current || !kdChartRef.current || !macdChartRef.current) return;
    if (isSwitchingRes || isPending) return; // Don't draw while swapping

    try {
      const chartOptions: any = {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#cbd5e1', fontSize: 10 },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: 'rgba(255,255,255,0.4)', width: 1 as const, style: LineStyle.Dashed }, horzLine: { color: 'rgba(255,255,255,0.4)', width: 1 as const, style: LineStyle.Dashed } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    };

    // 1. Initialize 4 Charts
    const mainChart = createChart(mainChartRef.current, { ...chartOptions });
    const rsiChart = createChart(rsiChartRef.current, { ...chartOptions });
    const kdChart = createChart(kdChartRef.current, { ...chartOptions });
    const macdChart = createChart(macdChartRef.current, { ...chartOptions });

    // Ensure strict horizontal alignment
    rsiChart.timeScale().applyOptions({ visible: false });
    kdChart.timeScale().applyOptions({ visible: false });
    mainChart.timeScale().applyOptions({ visible: false }); // MACD (bottom) shows time

    // Prepare Data
    const data = stockDetail.chartData.map(d => ({ ...d, time: d.originalTimestamp as Time })).sort((a,b) => (a.time as number) - (b.time as number));
    // Remove duplicates based on time
    const uniqueDataMap = new Map();
    data.forEach(d => uniqueDataMap.set(d.time, d));
    const uniqueData = Array.from(uniqueDataMap.values()).sort((a,b) => (a.time as number) - (b.time as number));

    // MAIN: Candlesticks
    const candleSeries = mainChart.addCandlestickSeries({ upColor: isUpColorHex, downColor: isDownColorHex, borderVisible: false, wickUpColor: isUpColorHex, wickDownColor: isDownColorHex, lastValueVisible: false, priceLineVisible: false });
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

    // Syncing TimeRange & Crosshairs
    const charts = [mainChart, rsiChart, kdChart, macdChart];
    
    // Fit content and Zoom to last 100 bars
    mainChart.timeScale().fitContent();
    const lastIndex = uniqueData.length;
    mainChart.timeScale().setVisibleLogicalRange({
      from: lastIndex - 30,
      to: lastIndex + 2, // Small buffer at end
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
          // Find matching data for our Tooltip
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

    // Resize Observer
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
       console.error(err);
       setChartDebugError(err.toString());
    }
  }, [stockDetail, candleColorStyle, isSwitchingRes, isPending]);

  return (
    <div className="min-h-screen bg-surface pb-40">
      <nav className="fixed top-0 z-50 w-full bg-surface-container-low flex justify-between items-center px-6 h-16 shadow-none">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="text-on-surface opacity-70 hover:bg-on-surface/5 p-2 rounded-xl transition-colors active:scale-95 duration-200"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-headline font-bold tracking-tight text-xl text-primary">{dailyDetail ? dailyDetail.symbol : stock} </h1>
        </div>
        <button 
          onClick={onSettingsClick}
          className="text-on-surface opacity-70 hover:bg-on-surface/5 p-2 rounded-xl transition-colors active:scale-95 duration-200"
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>

      <main className="flex-grow pt-32 px-4 md:px-8 max-w-5xl mx-auto w-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-40 bg-surface/50 backdrop-blur-sm flex items-center justify-center rounded-3xl">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}

        <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="font-label text-sm uppercase tracking-widest text-primary mb-1 block">
                {(initialName && initialName !== stock ? initialName : dailyDetail?.name) || t('common.loading')}
              </span>
              <h2 className={`font-headline text-5xl font-extrabold tracking-tighter ${isUpColor} flex items-baseline gap-4`}>
                {displayPrice?.toFixed(2) || '---.--'} 
                <span className={`text-xl font-medium tracking-normal ${isUpColor}`}>
                  {isUpToday ? '+' : ''}{displayChange?.toFixed(2) || '0.00'} 
                  ({isUpToday ? '+' : ''}{displayPercent?.toFixed(2) || '0.00'}%)
                </span>
              </h2>
            </div>
            <div className="flex gap-3">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-surface-container-highest/50 backdrop-blur-md text-secondary text-xs font-bold border border-outline-variant/20">
                <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span> {t('detail.marketData')}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative">
          {/* Chart Area */}
          <section className="md:col-span-8 group animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative bg-[#161a25] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 border border-outline-variant/10 flex flex-col h-[700px]">
              
                {/* Switching / Loading Overlay inside Chart Container */}
              <AnimatePresence>
                {(isSwitchingRes || isPending) && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
                    className="absolute inset-0 z-50 bg-[#161a25]/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-surface-container-high px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-outline-variant/20">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="font-bold text-sm tracking-wide text-on-surface">{t('detail.loading.canvas')}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {chartDebugError && (
                 <div className="absolute inset-x-0 top-0 z-50 bg-red-500/90 text-white p-4 text-xs font-mono whitespace-pre-wrap overflow-auto shadow-xl">
                   <h3 className="font-bold mb-2 uppercase">{t('detail.error.chart')}</h3>
                   {chartDebugError}
                 </div>
              )}

              {/* Custom Crosshair Tooltip Overlay */}
              {tooltipData && !(isSwitchingRes || isPending) && (
                <div className="absolute top-20 right-8 bg-surface-container/90 backdrop-blur-md border border-outline-variant/30 rounded-xl p-3 shadow-2xl text-[11px] space-y-2 z-40 min-w-[200px] pointer-events-none transition-all duration-75">
                  <p className="font-bold text-on-surface mb-2 border-b border-outline-variant/20 pb-1 flex justify-between">
                    <span>{tooltipData.time}</span>
                    <span className="text-on-surface-variant font-normal">{t('detail.tooltip.vol')}: {(tooltipData.volume / 1000).toFixed(1)}k</span>
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="text-on-surface-variant">O: <span className={tooltipData.isUp ? t('settings.candle.up') === '漲' ? 'text-red-400' : 'text-green-400' : t('settings.candle.up') === '漲' ? 'text-green-400' : 'text-red-400'}>{tooltipData.open}</span></span>
                    <span className="text-on-surface-variant">C: <span className={tooltipData.isUp ? t('settings.candle.up') === '漲' ? 'text-red-400' : 'text-green-400' : t('settings.candle.up') === '漲' ? 'text-green-400' : 'text-red-400'}>{tooltipData.close}</span></span>
                    <span className="text-on-surface-variant">H: <span className={tooltipData.isUp ? t('settings.candle.up') === '漲' ? 'text-red-400' : 'text-green-400' : t('settings.candle.up') === '漲' ? 'text-green-400' : 'text-red-400'}>{tooltipData.high}</span></span>
                    <span className="text-on-surface-variant">L: <span className={tooltipData.isUp ? t('settings.candle.up') === '漲' ? 'text-red-400' : 'text-green-400' : t('settings.candle.up') === '漲' ? 'text-green-400' : 'text-red-400'}>{tooltipData.low}</span></span>
                  </div>
                  <div className="border-t border-outline-variant/10 pt-1 mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="text-blue-400 tracking-tight">{t('detail.indicator.ema12')}: {tooltipData.ema12 || '-'}</span>
                    <span className="text-yellow-400 tracking-tight">{t('detail.indicator.ma5')}: {tooltipData.ma5 || '-'}</span>
                  </div>
                  <div className="border-t border-outline-variant/10 pt-1 mt-1 grid grid-cols-3 gap-x-1 gap-y-1">
                    <span className="text-purple-400 tracking-tight">RSI: {tooltipData.rsi14 || '-'}</span>
                    <span className="text-orange-400 tracking-tight">K: {tooltipData.k9 || '-'}</span>
                    <span className="text-sky-400 tracking-tight">D: {tooltipData.d9 || '-'}</span>
                  </div>
                  <div className="border-t border-outline-variant/10 pt-1 mt-1 flex flex-col gap-0.5">
                    <span className="text-[10px] text-on-surface-variant uppercase">{t('detail.indicator.macd')}</span>
                    <div className="grid grid-cols-3 gap-x-1">
                      <span className="text-rose-400 tracking-tight">DIF: {tooltipData.macdLine || '-'}</span>
                      <span className="text-teal-400 tracking-tight">MACD: {tooltipData.macdSignal || '-'}</span>
                      <span className="text-on-surface tracking-tight">OSC: {tooltipData.macdHist || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="relative flex-grow flex flex-col p-6 pr-2">
                <div className="flex justify-between items-center mb-2 pl-2 z-10">
                  <div className="flex gap-5 pointer-events-none">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{t('detail.indicators')}</span>
                      <div className="flex gap-3">
                        <span className="text-[11px] font-label font-bold text-yellow-500 opacity-80">{t('detail.indicator.ma5')}</span>
                        <span className="text-[11px] font-label font-bold text-blue-500 opacity-80">{t('detail.indicator.ema12')}</span>
                        <span className="text-[11px] font-label font-bold text-white opacity-60">{t('detail.indicator.bb')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex bg-surface-container-high p-1 rounded-xl z-10 pointer-events-auto">
                    {[
                      { id: 'D', label: t('detail.res.day') },
                      { id: 'W', label: t('detail.res.week') },
                      { id: 'M', label: t('detail.res.month') }
                    ].map((res) => (
                      <button 
                        key={res.id}
                        onClick={() => handleResChange(res.id as Resolution)}
                        className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeRes === res.id && !isSwitchingRes ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 4-in-1 Canvas Charts Layout */}
                <div className="w-full flex-grow flex flex-col gap-[2px]">
                  {/* MAIN K-Line Chart */}
                  <div className="relative w-full" style={{ flex: 45 }}>
                    <div ref={mainChartRef} className="w-full h-full" />
                  </div>

                  {/* RSI Chart */}
                  <div className="relative w-full" style={{ flex: 15 }}>
                    <span className="absolute left-2 top-0 text-[9px] font-bold text-purple-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.rsi')}</span>
                    <div ref={rsiChartRef} className="w-full h-full" />
                  </div>

                  {/* KD Chart */}
                  <div className="relative w-full" style={{ flex: 15 }}>
                    <span className="absolute left-2 top-0 text-[9px] font-bold text-orange-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.kd')}</span>
                    <div ref={kdChartRef} className="w-full h-full" />
                  </div>

                  {/* MACD Chart */}
                  <div className="relative w-full pb-4" style={{ flex: 25 }}>
                    <span className="absolute left-2 top-0 text-[9px] font-bold text-rose-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.macd')}</span>
                    <div ref={macdChartRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="md:col-span-4 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            {/* AI Recommendation */}
            <div className="bg-primary/10 border border-primary/20 rounded-3xl p-8 shadow-xl relative overflow-hidden group min-h-[220px]">
              {isAiLoading ? (
                <div className="flex flex-col h-full animate-pulse">
                  <div className="w-1/2 h-6 bg-primary/20 rounded mb-6"></div>
                  <div className="flex justify-between items-end mt-auto">
                    <div className="space-y-2">
                       <div className="w-16 h-4 bg-primary/10 rounded"></div>
                       <div className="w-24 h-10 bg-primary/20 rounded"></div>
                    </div>
                    <div className="space-y-2 text-right">
                       <div className="w-20 h-4 bg-primary/10 rounded ml-auto"></div>
                       <div className="w-32 h-8 bg-on-surface/10 rounded ml-auto"></div>
                    </div>
                  </div>
                </div>
              ) : aiError ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <ShieldAlert className="w-8 h-8 text-error/60" />
                  <p className="text-xs text-on-surface-variant">{t('common.error')}: {aiError}</p>
                </div>
              ) : aiAnalysis ? (
                <>
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="w-24 h-24 text-primary" />
                  </div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="font-headline text-lg font-bold text-on-surface">{t('ai.advice.title')}</h3>
                    <div className={`px-3 py-1 rounded-full text-on-primary text-[10px] font-bold uppercase tracking-widest ${
                      aiAnalysis.recommendation.toLowerCase().includes('sell') ? 'bg-error' : 'bg-primary'
                    }`}>
                      {aiAnalysis.recommendation}
                    </div>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">{t('ai.advice.confidence')}</p>
                        <p className="text-3xl font-headline font-bold text-primary">{aiAnalysis.confidence}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1">{t('ai.advice.targetPrice')}</p>
                        <p className="text-xl font-headline font-bold text-on-surface">{aiAnalysis.targetPrice}</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${aiAnalysis.confidence}%` }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                        className="h-full bg-primary shadow-[0_0_15px_rgba(78,222,163,0.4)]"
                      ></motion.div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* News Sentiment */}
            <div className="bg-surface-container rounded-3xl p-8 shadow-xl relative overflow-hidden border border-outline-variant/10 min-h-[280px]">
              {isAiLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="flex justify-between">
                    <div className="w-1/3 h-5 bg-on-surface/10 rounded"></div>
                    <div className="w-1/4 h-5 bg-primary/10 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-on-surface/5 rounded"></div>
                    <div className="w-full h-8 bg-on-surface/10 rounded-xl"></div>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-headline text-lg font-bold text-on-surface">{t('news.sentiment.title')}</h3>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary">
                      {aiAnalysis.sentiment.positive > aiAnalysis.sentiment.negative ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-error" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {aiAnalysis.sentiment.positive > 0.6 ? t('news.sentiment.bullish') : aiAnalysis.sentiment.negative > 0.6 ? t('news.sentiment.bearish') : t('history.sentiment.neutral')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-label">
                        <span className="text-primary font-bold uppercase tracking-tighter">{t('news.sentiment.positive')}</span>
                        <span className="text-on-surface font-bold">{Math.round(aiAnalysis.sentiment.positive * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${aiAnalysis.sentiment.positive * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-primary shadow-[0_0_10px_rgba(78,222,163,0.5)]"
                        ></motion.div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/10">
                      <div className="space-y-1">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{t('news.sentiment.neutral')}</p>
                        <p className="text-lg font-headline font-bold text-on-surface">{Math.round(aiAnalysis.sentiment.neutral * 100)}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-error uppercase font-bold tracking-widest">{t('news.sentiment.negative')}</p>
                        <p className="text-lg font-headline font-bold text-on-surface">{Math.round(aiAnalysis.sentiment.negative * 100)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5">
                    <p className="text-[11px] text-on-surface-variant leading-relaxed italic">
                      "{aiAnalysis.summary}"
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </aside>

          {/* AI Analysis - 近期 中期 遠期 */}
          <section className="md:col-span-12 bg-surface-container-high/40 rounded-3xl p-10 backdrop-blur-sm border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-xl shadow-primary/20">
                  <BrainCircuit className="w-6 h-6 text-on-primary" />
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">{t('ai.multi.title')}</h3>
                  <p className="text-[10px] text-primary uppercase font-bold tracking-[0.3em]">{t('ai.multi.subtitle')}</p>
                </div>
              </div>
              
              <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/10">
                {[
                  { id: 'short', label: t('ai.multi.tab.short'), icon: Clock },
                  { id: 'medium', label: t('ai.multi.tab.medium'), icon: Target },
                  { id: 'long', label: t('ai.multi.tab.long'), icon: Rocket }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAiTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      aiTab === tab.id 
                        ? 'bg-primary text-on-primary shadow-md' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-grow min-h-[300px]">
              <AnimatePresence mode="wait">
                {isAiLoading ? (
                   <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 animate-pulse pt-4"
                   >
                     <div className="h-32 w-full bg-on-surface/5 rounded-3xl"></div>
                     <div className="h-4 w-3/4 bg-on-surface/5 rounded ml-2"></div>
                     <div className="h-4 w-1/2 bg-on-surface/5 rounded ml-2"></div>
                   </motion.div>
                ) : aiAnalysis ? (
                  <motion.div
                    key={aiTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {aiTab === 'short' && (
                      <div className="space-y-5">
                        <div className="p-6 rounded-2xl bg-primary/5 border-l-4 border-primary">
                          <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> {t('ai.multi.short.title')}
                          </h4>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            {aiAnalysis.shortTerm}
                          </p>
                        </div>
                      </div>
                    )}
                    {aiTab === 'medium' && (
                      <div className="space-y-5">
                        <div className="p-6 rounded-2xl bg-secondary/5 border-l-4 border-secondary">
                          <h4 className="font-bold text-secondary mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" /> {t('ai.multi.medium.title')}
                          </h4>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            {aiAnalysis.mediumTerm}
                          </p>
                        </div>
                      </div>
                    )}
                    {aiTab === 'long' && (
                      <div className="space-y-5">
                        <div className="p-6 rounded-2xl bg-tertiary/5 border-l-4 border-tertiary">
                          <h4 className="font-bold text-tertiary mb-3 flex items-center gap-2">
                            <Rocket className="w-4 h-4" /> {t('ai.multi.long.title')}
                          </h4>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            {aiAnalysis.longTerm}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Disclaimer */}
        <footer className="mt-16 pt-8 border-t border-outline-variant/10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5">
            <ShieldAlert className="w-5 h-5 text-on-surface-variant/50 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t('disclaimer.title')}</h4>
              <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                {t('disclaimer.desc')}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
