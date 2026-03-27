import React, { useState, useEffect, useRef, useTransition, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, BarChart3, BrainCircuit, Clock, Target, Rocket, Globe, ShieldAlert, Loader2, Settings } from 'lucide-react';
import { fetchStockDetail, StockDetailResult, ProcessedChartData, fetchLocalizedNames } from '../api/yahoo';
import { analyzeStock, stripMarkdown } from '../api/ai';
import { useTranslation } from '../contexts/LanguageContext';
import { getCachedStockData, setCachedStockData } from '../utils/cache';
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, Time, SeriesMarker } from 'lightweight-charts';
import { AIAnalysis } from '../types';
import { SentimentPieChart } from '../components/SentimentPieChart';

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
  subModel,
  recordId
}: {
  stock: string,
  onBack: () => void,
  onSettingsClick: () => void,
  initialName?: string,
  candleColorStyle?: 'red-up' | 'green-up',
  apiKeys: { google: string, openai: string, claude: string },
  selectedModel: string,
  subModel: string,
  recordId: string | null
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
  const [recordNames, setRecordNames] = useState<{ zh: string, en: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      if (recordId) {
        // Load from DB instead of API
        const { analysisDb } = await import('../utils/db');
        const record = await analysisDb.getRecord(recordId);
        if (record && isMounted) {
          setDataStore(record.ohlcv as any);
          setAiAnalysis(record.analysis);
          setRecordNames({ zh: record.nameZh || '', en: record.nameEn || '' });
          setIsLoading(false);
          setIsAiLoading(false);
        }
        return;
      }

      // Live mode
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
  }, [stock, recordId, language]);

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
    // If we are viewing a historical record, don't trigger AI
    if (recordId) return;

    // We need both dailyDetail (for general info) and stockDetail (for current indicator values)
    if (!dailyDetail || !stockDetail || aiAnalysis || isAiLoading || aiError) return;

    const runAnalysis = async () => {
      setIsAiLoading(true);
      setAiError(null);

      const provider = selectedModel as 'google' | 'openai' | 'claude';
      const key = apiKeys[provider];

      let modelId = subModel;
      if (!modelId) {
        if (provider === 'google') modelId = 'gemini-2.0-flash';
        else if (provider === 'openai') modelId = 'gpt-4o-mini';
        else if (provider === 'claude') modelId = 'claude-3-5-haiku-20241022';
      }

      if (!key) {
        setAiError(`Missing API Key for ${provider} in settings`);
        setIsAiLoading(false);
        return;
      }

      try {
        const result = await analyzeStock(
          dailyDetail!.symbol,
          dailyDetail!.name || stock,
          dailyDetail!.price,
          dailyDetail!.changePercent,
          stockDetail?.indicators || {},
          key,
          modelId,
          language as 'zh-TW' | 'en-US'
        );
        setAiAnalysis(result);

        // CREATE SNAPSHOT IN INDEXEDDB
        const { analysisDb } = await import('../utils/db');
        const localizedNames = await fetchLocalizedNames(dailyDetail!.symbol);

        const record = {
          id: `record_${Date.now()}_${dailyDetail!.symbol}`,
          symbol: dailyDetail!.symbol,
          name: dailyDetail!.name || stock,
          nameEn: localizedNames.en,
          nameZh: localizedNames.zh,
          timestamp: Date.now(),
          price: dailyDetail!.price,
          changePercent: dailyDetail!.changePercent,
          analysis: result,
          ohlcv: dataStore,
          indicators: stockDetail?.indicators || {},
          model: modelId,
          language: language
        };
        await analysisDb.saveRecord(record);

      } catch (err: any) {
        setAiError(err.message || 'AI Analysis failed');
      } finally {
        setIsAiLoading(false);
      }
    };

    runAnalysis();
  }, [dailyDetail, stockDetail, subModel, aiAnalysis, isAiLoading, aiError, apiKeys, selectedModel, stock, language, recordId, dataStore]);

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
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
          minimumWidth: 80, // Force consistent width for grid alignment
        },
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
      const data = stockDetail.chartData.map(d => ({ ...d, time: d.originalTimestamp as Time })).sort((a, b) => (a.time as number) - (b.time as number));
      // Remove duplicates based on time
      const uniqueDataMap = new Map();
      data.forEach(d => uniqueDataMap.set(d.time, d));
      const uniqueData = Array.from(uniqueDataMap.values()).sort((a, b) => (a.time as number) - (b.time as number));

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
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2 min-w-0">
              <span className="font-label text-sm uppercase tracking-widest text-primary mb-1 block">
                {recordNames
                  ? (language === 'zh-TW' ? recordNames.zh : recordNames.en)
                  : (initialName && initialName !== stock ? initialName : dailyDetail?.name) || t('common.loading')}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className={`font-headline text-4xl md:text-5xl font-extrabold tracking-tighter ${isUpColor} whitespace-nowrap`}>
                  {displayPrice?.toFixed(2) || '---.--'}
                </h2>
                <span className={`text-lg md:text-xl font-medium tracking-normal ${isUpColor} whitespace-nowrap`}>
                  {isUpToday ? '+' : ''}{displayChange?.toFixed(2) || '0.00'}
                  ({isUpToday ? '+' : ''}{displayPercent?.toFixed(2) || '0.00'}%)
                </span>
              </div>
              {/* Removed AI Recommendation Badge as requested */}

              {/* Removed AI Recommendation Badge as requested */}
            </div>
            <div className="flex shrink-0">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-surface-container-highest/50 backdrop-blur-md text-secondary text-[10px] md:text-xs font-bold border border-outline-variant/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2 animate-pulse"></span> {t('detail.marketData')}
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-10 relative">
          {/* AI Error Section */}
          <AnimatePresence>
            {aiError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-error/10 border border-error/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-error/20 rounded-2xl flex items-center justify-center text-error">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-headline font-bold text-on-surface">{t('detail.analysis.failed')}</h4>
                    <p className="text-sm text-on-surface-variant max-w-md">{aiError}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAiError(null);
                    setAiAnalysis(null);
                  }}
                  className="px-8 py-3 bg-error text-on-error rounded-2xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all w-full md:w-auto"
                >
                  {t('detail.analysis.retry')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {/* 1. Technical Charts */}
          <section className="w-full group animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative bg-[#161a25] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 border border-outline-variant/10 flex flex-col h-[600px] md:h-[700px]">
              <AnimatePresence>
                {(isSwitchingRes || isPending) && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                </div>
              )}

              <div className="relative flex-grow flex flex-col p-6 pr-2">
                <div className="flex justify-between items-center mb-2 pl-2 z-10">
                  <div className="flex bg-surface-container-high p-1 rounded-xl z-10 pointer-events-auto ml-auto">
                    {(['D', 'W', 'M'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => handleResChange(res)}
                        className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeRes === res && !isSwitchingRes ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        {t(`detail.res.${res === 'D' ? 'day' : res === 'W' ? 'week' : 'month'}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full flex-grow flex flex-col gap-[2px]">
                  <div className="relative w-full" style={{ flex: 45 }}>
                    <div ref={mainChartRef} className="w-full h-full" />
                  </div>
                  <div className="relative w-full" style={{ flex: 15 }}>
                    <span className="absolute left-2 top-0 text-[9px] font-bold text-purple-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.rsi')}</span>
                    <div ref={rsiChartRef} className="w-full h-full" />
                  </div>
                  <div className="relative w-full" style={{ flex: 15 }}>
                    <span className="absolute left-2 top-0 text-[9px] font-bold text-orange-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.kd')}</span>
                    <div ref={kdChartRef} className="w-full h-full" />
                  </div>
                  <div className="relative w-full pb-4" style={{ flex: 25 }}>
                    <span className="absolute left-2 top-0 text-[9px] font-bold text-rose-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.macd')}</span>
                    <div ref={macdChartRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 1. Strategic Entry/Exit */}
          <section className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-75">
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Target className="w-32 h-32 text-primary" />
              </div>
              {isAiLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="w-1/3 h-6 bg-primary/20 rounded"></div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-primary/10 rounded-2xl"></div>)}
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="relative z-10">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-8">{t('detail.analysis.levels')}</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-12 py-12 border-y border-white/5 items-center mb-10">
                    {/* Row 1: Entry and Win Rate */}
                    <div className="space-y-2 text-center">
                      <p className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">{t('detail.analysis.entry')}</p>
                      <p className="text-2xl md:text-4xl font-headline font-bold text-on-surface">{aiAnalysis.entryPrice || 'N/A'}</p>
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">{t('detail.analysis.winRate')}</p>
                      <p className="text-2xl md:text-4xl font-headline font-bold text-primary">{aiAnalysis.winRate || 0}%</p>
                    </div>

                    {/* Row 2: Stop Loss and Take Profit */}
                    {(() => {
                      const exitParts = (aiAnalysis.exitPrice || '').split(/[/|-]/);
                      const stopLoss = exitParts.length > 1 ? exitParts[0]?.trim() : (aiAnalysis.exitPrice || 'N/A');
                      const takeProfit = exitParts.length > 1 ? exitParts[1]?.trim() : (aiAnalysis.targetPrice || 'N/A');

                      return (
                        <>
                          <div className="space-y-2 text-center">
                            <p className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">{t('detail.analysis.stopLoss')}</p>
                            <p className="text-2xl md:text-4xl font-headline font-bold text-error/80">{stopLoss}</p>
                          </div>
                          <div className="space-y-2 text-center">
                            <p className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">{t('detail.analysis.takeProfit')}</p>
                            <p className="text-2xl md:text-4xl font-headline font-bold text-secondary">{takeProfit}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5">
                    <p className="text-sm leading-relaxed text-on-surface/80 italic text-center">"{stripMarkdown(aiAnalysis.summary)}"</p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* 2. Integrated News Sentiment Analysis */}
          <section className="w-full bg-surface-container rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface">新聞情緒深度分析</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
              {/* Left Column: Visual Sentiment */}
              <div className="flex flex-col items-center justify-center py-6 px-4">
                <SentimentPieChart
                  sentiment={aiAnalysis?.sentiment || { positive: 0, neutral: 0, negative: 0 }}
                  isLoading={isAiLoading}
                />
              </div>

              {/* Right Column: Tactical Summary */}
              <div className="relative flex flex-col h-full min-h-[300px]">
                {isAiLoading ? (
                  <div className="h-full bg-on-surface/5 rounded-3xl animate-pulse" />
                ) : aiAnalysis ? (
                  <div className="h-full text-sm text-on-surface-variant leading-relaxed bg-surface-container-low/50 p-8 rounded-[2rem] border border-white/5 whitespace-pre-wrap shadow-inner overflow-auto custom-scrollbar">
                    {stripMarkdown(aiAnalysis.newsSummary)}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* 3. Planning Timeline */}
          <section className="w-full bg-surface-container rounded-3xl p-8 shadow-xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <Clock className="w-6 h-6 text-primary" />
                <h3 className="font-headline text-xl font-bold text-on-surface">{t('detail.timeline.title')}</h3>
              </div>
              <div className="flex bg-surface-container-high p-1.5 rounded-2xl self-start md:self-auto">
                {(['short', 'medium', 'long'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAiTab(tab)}
                    className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${aiTab === tab ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {t(`ai.multi.tab.${tab}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface-container-low p-8 rounded-2xl border border-white/5 min-h-[100px] flex items-center">
              {isAiLoading ? (
                <div className="w-full h-12 bg-on-surface/5 rounded-xl animate-pulse" />
              ) : aiAnalysis ? (
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                  {stripMarkdown(aiTab === 'short' ? aiAnalysis.shortTerm : aiTab === 'medium' ? aiAnalysis.mediumTerm : aiAnalysis.longTerm)}
                </p>
              ) : null}
            </div>
          </section>

          {/* 4. Fundamental Standalone */}
          <section className="w-full bg-surface-container rounded-3xl p-8 shadow-xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-250">
            <div className="flex items-center gap-4 mb-6">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h3 className="font-headline text-lg font-bold text-on-surface">{t('detail.experts.fundamental')}</h3>
            </div>
            {isAiLoading ? (
              <div className="h-20 bg-on-surface/5 rounded-2xl animate-pulse" />
            ) : aiAnalysis ? (
              <div className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-low p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                {stripMarkdown(aiAnalysis.fundamentalSummary)}
              </div>
            ) : null}
          </section>

          {/* 5. Global Trend Standalone */}
          <section className="w-full bg-surface-container rounded-3xl p-8 shadow-xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="flex items-center gap-4 mb-6">
              <Globe className="w-6 h-6 text-secondary" />
              <h3 className="font-headline text-lg font-bold text-on-surface">{t('detail.experts.trend')}</h3>
            </div>
            {isAiLoading ? (
              <div className="h-20 bg-on-surface/5 rounded-2xl animate-pulse" />
            ) : aiAnalysis ? (
              <div className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-low p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                {stripMarkdown(aiAnalysis.trendSummary)}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-outline-variant/10">
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-surface-container-low/50 border border-outline-variant/5 text-on-surface-variant/70 text-[11px] leading-relaxed">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold uppercase tracking-widest">{t('disclaimer.title')}</h4>
              <p>{t('disclaimer.desc')}</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
