import React, { useState, useEffect, useRef, useTransition, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getADRSymbol } from '../utils/market';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  BrainCircuit,
  Clock,
  Target,
  Rocket,
  Globe,
  ShieldAlert,
  Loader2,
  Settings,
  Newspaper,
  Banknote,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  ChevronRight,
  Quote,
  X
} from 'lucide-react';
import { fetchStockDetail, StockDetailResult, ProcessedChartData, fetchLocalizedNames, fetchStockFundamentals, StockFundamentals } from '../api/yahoo';
import { analyzeStock, stripMarkdown, AIError, AIErrorCode } from '../api/ai';
import { useTranslation } from '../contexts/LanguageContext';
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, Time, SeriesMarker } from 'lightweight-charts';
import { AIAnalysis } from '../types';
import { SentimentPieChart } from '../components/SentimentPieChart';
import { useChart, Resolution } from '../hooks/useChart';

// --- Global Tracker for Active Analysis to prevent double-calls in Strict Mode ---
const activeAnalyses = new Set<string>();

// --- Main Detail Screen ---

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

  const [dataStore, setDataStore] = useState<{
    D: StockDetailResult | null;
    W: StockDetailResult | null;
    M: StockDetailResult | null;
    fundamentals: StockFundamentals | null;
  }>({
    D: null,
    W: null,
    M: null,
    fundamentals: null
  });
  const [adrQuote, setAdrQuote] = useState<{ symbol: string, changePercent: number } | null>(null);

  // Use Custom Hook for Chart Logic
  const {
    refs,
    tooltipData,
    chartDebugError
  } = useChart({
    stockDetail: dataStore[activeRes],
    candleColorStyle,
    isSwitchingRes,
    isPending,
    t
  });

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiErrorCode, setAiErrorCode] = useState<AIErrorCode | null>(null);
  const [debugRawResponse, setDebugRawResponse] = useState<string | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [recordNames, setRecordNames] = useState<{ zh: string, en: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      if (!isMounted) return;
      setIsLoading(true);
      const { analysisDb } = await import('../utils/db');

      // --- PHASE 1: ATTEMPT TO LOAD FROM DB ---
      if (recordId) {
        const record = await analysisDb.getRecord(recordId);
        
        if (record && record.analysis && isMounted) {
          console.log(`[Detail] Restoring record snapshot for ${record.symbol}`);
          
          if (record.ohlcv) {
            setDataStore(record.ohlcv as any);
          }
          
          setAiAnalysis(record.analysis);
          setRecordNames({ zh: record.nameZh || '', en: record.nameEn || '' });
          
          setIsAiLoading(false);
          setIsLoading(false);
          return; // STOP HERE: History restore complete
        }
      }

      // --- PHASE 2: LIVE FETCH ---
      try {
        const [resD, resW, resM, resFunds] = await Promise.all([
          fetchStockDetail(stock, '2y', '1d', language),
          fetchStockDetail(stock, '10y', '1wk', language),
          fetchStockDetail(stock, 'max', '1mo', language),
          fetchStockFundamentals(stock, language)
        ]);

        if (isMounted) {
          setDataStore({ D: resD, W: resW, M: resM, fundamentals: resFunds });
          
          // ADR Check (Only in Live Mode)
          const adrSym = getADRSymbol(stock);
          if (adrSym) {
            fetchStockDetail(adrSym, '1d', '1d', language).then(adrRes => {
              if (adrRes && isMounted) {
                setAdrQuote({ symbol: adrRes.symbol, changePercent: adrRes.changePercent });
              }
            });
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        if (isMounted) setIsLoading(false);
      }
    }
    loadAllData();
    
    // Ensure the page starts at the top when landing on DetailScreen
    window.scrollTo(0, 0);

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

  const skeletonSavedRef = useRef(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  // AI triggering effect - Refactored for Two-Phase Saving
  useEffect(() => {
    // If we have analysis or are currently loading, don't trigger
    if (aiAnalysis || isAiLoading || aiError) return;

    // If we already saved skeleton in THIS session, don't re-trigger manually
    if (skeletonSavedRef.current) return;

    // We need dailyDetail to create the initial skeleton
    if (!dailyDetail || !stockDetail || aiAnalysis || isAiLoading || aiError) return;

    const runAnalysis = async () => {
      // Guard against double calls for the same record (Strict Mode remount)
      if (activeAnalyses.has(recordId || '')) return;
      if (recordId) activeAnalyses.add(recordId);

      setIsAiLoading(true);
      setAiError(null);
      setAiErrorCode(null);
      setDebugRawResponse(null);

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
        const { analysisDb } = await import('../utils/db');
        const localizedNames = await fetchLocalizedNames(dailyDetail!.symbol);

        // --- PHASE 1: IMMEDIATE SKELETON SAVE (Skip if we already have recordId) ---
        const newRecordId = recordId || `record_${Date.now()}_${dailyDetail!.symbol}`;
        const skeletonRecord = {
          id: newRecordId,
          symbol: dailyDetail!.symbol,
          name: dailyDetail!.name || stock,
          nameEn: localizedNames.en,
          nameZh: localizedNames.zh,
          timestamp: Date.now(),
          price: dailyDetail!.price,
          changePercent: dailyDetail!.changePercent,
          ohlcv: dataStore,
          indicators: stockDetail?.indicators || {},
          model: modelId,
          language: language
        };

        await analysisDb.saveRecord(skeletonRecord);
        skeletonSavedRef.current = true;
        setCurrentRecordId(newRecordId);

        // --- PHASE 2: DETACHED BACKGROUND ANALYSIS ---
        // We don't await the AI result here for the skeleton save,
        // but we keep the promise running to update the record later.
        const nameToUse = language === 'zh-TW' ? (localizedNames.zh || dailyDetail!.name || stock) : (localizedNames.en || dailyDetail!.name || stock);

        analyzeStock(
          dailyDetail!.symbol,
          nameToUse,
          dailyDetail!.price,
          dailyDetail!.changePercent,
          stockDetail?.indicators || {},
          key,
          modelId,
          language as 'zh-TW' | 'en-US',
          dataStore.fundamentals
        ).then(async (result) => {
          // --- CRITICAL CHECK: Has the record been deleted while we were waiting for AI? ---
          const existingRecord = await analysisDb.getRecord(newRecordId);
          if (!existingRecord) {
            console.log(`[AI Client] Record ${newRecordId} no longer exists (likely deleted). Skipping final save.`);
            if (recordId) activeAnalyses.delete(recordId);
            return;
          }

          // Re-fetch current record state to avoid overwriting newer status if any
          const updatedRecord = {
            ...skeletonRecord,
            analysis: result
          };

          await analysisDb.saveRecord(updatedRecord);

          // Update local UI state if user is still on this screen
          setAiAnalysis(result);
          setIsAiLoading(false);
          if (recordId) activeAnalyses.delete(recordId);
        }).catch((err: any) => {
          console.error("Background AI Analysis failed:", err);
          if (err instanceof AIError) {
            setAiErrorCode(err.code);
            setAiError(err.message);
            setDebugRawResponse(err.rawResponse || null);
          } else {
            setAiError(err.message || 'AI Analysis failed');
          }
          setIsAiLoading(false);
          if (recordId) activeAnalyses.delete(recordId);
        });

      } catch (err: any) {
        setAiError(err.message || 'Initialization failed');
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

  // Chart initialization removed and moved to useChart hook

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
          <h1 className="font-headline font-bold tracking-tight text-xl text-on-surface/90">{t('onboarding.title')}</h1>
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
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <span className="font-headline text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                  {recordNames
                    ? (language === 'zh-TW' ? recordNames.zh : recordNames.en)
                    : (initialName && initialName !== stock ? initialName : dailyDetail?.name) || t('common.loading')}
                </span>
                <span className="font-headline text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                  {dailyDetail ? dailyDetail.symbol : stock}
                </span>
              </div>
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
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    aiErrorCode === AIErrorCode.INVALID_API_KEY ? 'bg-orange-400/20 text-orange-400' :
                    aiErrorCode === AIErrorCode.API_LIMIT_REACHED ? 'bg-yellow-400/20 text-yellow-400' :
                    'bg-error/20 text-error'
                  }`}>
                    {aiErrorCode === AIErrorCode.INVALID_API_KEY ? <Settings className="w-6 h-6" /> :
                     aiErrorCode === AIErrorCode.PARSE_ERROR ? <BrainCircuit className="w-6 h-6" /> :
                     <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div className="text-left flex-grow">
                    <h4 className="font-headline font-bold text-on-surface">
                      {aiErrorCode === AIErrorCode.PARSE_ERROR ? t('detail.analysis.failed.parse') :
                       aiErrorCode === AIErrorCode.API_LIMIT_REACHED ? t('detail.analysis.failed.limit') :
                       aiErrorCode === AIErrorCode.INVALID_API_KEY ? t('detail.analysis.failed.key') :
                       t('detail.analysis.failed')}
                    </h4>
                    <p className="text-sm text-on-surface-variant max-w-md">{aiError}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  {debugRawResponse && (
                    <button
                      onClick={() => setShowDebugModal(true)}
                      className="px-6 py-3 bg-surface-container-high text-on-surface rounded-2xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Info className="w-4 h-4" />
                      {t('detail.analysis.checkError')}
                    </button>
                  )}
                  {aiErrorCode === AIErrorCode.INVALID_API_KEY ? (
                    <button
                      onClick={onSettingsClick}
                      className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                      {t('settings.title')}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAiError(null);
                        setAiErrorCode(null);
                        setAiAnalysis(null);
                        skeletonSavedRef.current = false;
                      }}
                      className="px-8 py-3 bg-error text-on-error rounded-2xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                      {t('detail.analysis.retry')}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Debug Modal */}
          <AnimatePresence>
            {showDebugModal && debugRawResponse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-surface/90 backdrop-blur-xl"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-surface-container-high w-full max-w-3xl max-h-[80vh] rounded-[2.5rem] border border-outline-variant/20 shadow-2xl flex flex-col overflow-hidden"
                >
                  <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-highest/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl">
                        <BrainCircuit className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black">{t('detail.analysis.debug.title')}</h3>
                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">{t('detail.analysis.debug.subtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDebugModal(false)}
                      className="p-3 hover:bg-on-surface/5 rounded-2xl text-on-surface-variant transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-8 overflow-auto flex-grow bg-surface-container-low/50">
                    <div className="bg-[#0d1117] p-6 rounded-3xl border border-white/5 font-mono text-sm text-[#c9d1d9] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      <div className="flex items-center gap-2 text-rose-400 mb-4 pb-4 border-b border-white/5">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold">Raw Response from AI:</span>
                      </div>
                      {debugRawResponse}
                    </div>
                  </div>
                  <div className="p-8 bg-surface-container-highest/20 border-t border-outline-variant/10">
                    <button
                      onClick={() => setShowDebugModal(false)}
                      className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-sm tracking-[0.1em] uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {language === 'zh-TW' ? '了解並關閉' : 'Understand & Close'}
                    </button>
                  </div>
                </motion.div>
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
                <div className="flex justify-center items-center mb-6 pl-2 z-10">
                  <div className="flex bg-surface-container-high p-1 rounded-xl z-10 pointer-events-auto">
                    {(['D', 'W', 'M'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => handleResChange(res)}
                        className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeRes === res && !isSwitchingRes ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        {t(`detail.res.${res === 'D' ? 'day' : res === 'W' ? 'week' : 'month'}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full flex-grow flex flex-col gap-[2px]">
                  <div className="relative w-full" style={{ flex: 45 }}>
                    <div ref={refs.mainChartRef} className="w-full h-full" />
                  </div>
                  <div className="relative w-full" style={{ flex: 15 }}>
                    <span className="absolute left-2 top-0 text-xs font-bold text-purple-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.rsi')}</span>
                    <div ref={refs.rsiChartRef} className="w-full h-full" />
                  </div>
                  <div className="relative w-full" style={{ flex: 15 }}>
                    <span className="absolute left-2 top-0 text-xs font-bold text-orange-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.kd')}</span>
                    <div ref={refs.kdChartRef} className="w-full h-full" />
                  </div>
                  <div className="relative w-full pb-4" style={{ flex: 25 }}>
                    <span className="absolute left-2 top-0 text-xs font-bold text-rose-400 opacity-70 z-10 pointer-events-none">{t('detail.indicator.macd')}</span>
                    <div ref={refs.macdChartRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="w-full bg-surface-container rounded-[2.5rem] p-8 shadow-2xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-75">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight">戰術與策略總覽</h3>
                </div>
              </div>

              <div className="flex bg-surface-container-high/50 p-1.5 rounded-2xl self-start md:self-auto border border-white/5 backdrop-blur-sm shadow-inner">
                {(['short', 'medium', 'long'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAiTab(tab)}
                    className={`px-8 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${aiTab === tab ? 'bg-primary text-on-primary shadow-[0_0_20px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {t(`ai.multi.tab.${tab}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Grid - Content */}
            {isAiLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="h-80 bg-on-surface/5 rounded-3xl border border-white/5"></div>
              </div>
            ) : aiAnalysis ? (
              <div className="flex flex-col gap-8">
                {/* Financial Badges (Metrics) */}
                {aiAnalysis.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { key: 'pe', label: t('detail.analysis.pe'), val: aiAnalysis.metrics.pe, format: (v: number) => `${v.toFixed(1)}x`, icon: Banknote },
                      { key: 'roe', label: t('detail.analysis.roe'), val: aiAnalysis.metrics.roe, format: (v: number) => `${v.toFixed(1)}%`, icon: Activity },
                      { key: 'revenueGrowth', label: t('detail.analysis.revenueGrowth'), val: aiAnalysis.metrics.revenueGrowth, format: (v: number) => `${v.toFixed(1)}%`, icon: TrendingUp, color: aiAnalysis.metrics.revenueGrowth && aiAnalysis.metrics.revenueGrowth > 0 ? 'text-red-400' : 'text-green-400' },
                      { key: 'analystTarget', label: t('detail.analysis.analystTarget'), val: aiAnalysis.metrics.analystTarget, format: (v: number) => `$${v.toFixed(1)}`, icon: Target },
                      { key: 'adr', label: adrQuote ? `美股 ADR (${adrQuote.symbol})` : '美股 ADR', val: adrQuote?.changePercent, format: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`, icon: Globe, color: adrQuote ? (candleColorStyle === 'red-up' ? (adrQuote.changePercent >= 0 ? 'text-red-400' : 'text-green-400') : (adrQuote.changePercent >= 0 ? 'text-green-400' : 'text-red-400')) : 'text-on-surface-variant/30' },
                      { key: 'shortPercentOfFloat', label: t('detail.analysis.shortInterest'), val: aiAnalysis.metrics.shortPercentOfFloat, format: (v: number) => `${v.toFixed(1)}%`, icon: ShieldAlert, color: aiAnalysis.metrics.shortPercentOfFloat && aiAnalysis.metrics.shortPercentOfFloat > 10 ? 'text-orange-400' : 'text-on-surface' },
                      { key: 'recommendationKey', label: t('detail.analysis.recommendation'), val: aiAnalysis.metrics.recommendationKey, format: (v: string) => v.toUpperCase(), icon: Rocket, color: 'text-primary' }
                    ].filter(m => m.val !== undefined && m.val !== null).map((m, idx) => (
                      <div key={idx} className="bg-surface-container-low/40 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/5 flex flex-col items-center justify-center group hover:bg-surface-container-high/60 transition-all duration-300 shadow-sm relative overflow-hidden">
                        <m.icon className="w-4 h-4 text-on-surface-variant/30 mb-2 group-hover:text-primary/50 transition-colors" />
                        <span className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest mb-1 opacity-60 text-center">{m.label}</span>
                        <span className={`text-base font-headline font-black tracking-tight ${m.color || 'text-on-surface'}`}>
                          {m.format(m.val as never)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Sidebar: Direction & Risk */}
                  <div className="lg:w-48 shrink-0 flex flex-col py-8 px-4 bg-primary/5 border border-primary/10 rounded-[2.5rem] relative overflow-hidden text-center shadow-inner group transition-all duration-300">
                    <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity translate-y-2 translate-x-2">
                      {aiAnalysis.recommendation.toLowerCase().includes('buy') ? (
                        <TrendingUp className="w-32 h-32 text-red-500" />
                      ) : aiAnalysis.recommendation.toLowerCase().includes('sell') ? (
                        <TrendingDown className="w-32 h-32 text-green-500" />
                      ) : (
                        <BrainCircuit className="w-32 h-32 text-primary" />
                      )}
                    </div>

                    <div className="flex flex-col items-center mb-6">
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 opacity-60">{t('detail.analysis.direction')}</span>
                      <div className={`text-4xl font-black tracking-tighter ${aiAnalysis.recommendation.toLowerCase().includes('buy') ? 'text-red-500' :
                        aiAnalysis.recommendation.toLowerCase().includes('sell') ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                        {aiAnalysis.recommendation.toLowerCase().includes('buy') ? (language === 'zh-TW' ? '做多' : 'LONG') :
                          aiAnalysis.recommendation.toLowerCase().includes('sell') ? (language === 'zh-TW' ? '做空' : 'SHORT') :
                            (language === 'zh-TW' ? '觀望' : 'WAIT')}
                      </div>
                    </div>

                    {/* Risk Level Badge */}
                    <div className="mb-6 pt-4 border-t border-primary/10">
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 block opacity-60">{t('detail.analysis.risk')}</span>
                      {(() => {
                        const r = aiAnalysis.timelines?.[aiTab]?.riskLevel || 'Medium';
                        const colorClass = r === 'High' ? 'text-red-400 bg-red-400/10' : r === 'Low' ? 'text-primary bg-primary/10' : 'text-yellow-400 bg-yellow-400/10';
                        const RiskIcon = r === 'High' ? AlertTriangle : r === 'Low' ? ShieldCheck : Info;
                        return (
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 font-black text-xs ${colorClass}`}>
                            <RiskIcon className="w-3.5 h-3.5" />
                            {t(`detail.analysis.risk.${r.toLowerCase() as 'low' | 'medium' | 'high'}`)}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-xs text-on-surface opacity-70 italic leading-relaxed font-medium">
                      "{stripMarkdown(aiAnalysis.summary)}"
                    </div>
                  </div>

                  {/* Right Content: Tactical Levels & Strategy Preview */}
                  <div className="flex-grow flex flex-col gap-6">
                    {/* 2x2 Tactical Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Entry Box */}
                      <div className="bg-surface-container-high/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 group hover:border-primary/20 transition-all duration-300 shadow-lg flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">{t('detail.analysis.entryRange')}</span>
                          <Rocket className="w-4 h-4 text-on-surface-variant/20 group-hover:text-primary/40" />
                        </div>
                        <p className="text-lg sm:text-xl md:text-2xl font-headline font-black text-on-surface tracking-tight break-words">
                          {(() => {
                            const val = aiAnalysis.timelines?.[aiTab]?.entry || aiAnalysis.entryPrice;
                            if (!val) return 'N/A';
                            // Reuse cleaning logic for consistency
                            const match = val.match(/[0-9,.]+(?:\s?[-~]\s?[0-9,.]+)?/);
                            const clean = match ? match[0] : val;
                            return clean.replace(/([0-9,.]+)/g, m => {
                              const raw = m.replace(/,/g, '');
                              const n = parseFloat(raw);
                              return isNaN(n) ? m : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            });
                          })()}
                        </p>
                      </div>

                      {/* Win Rate Box */}
                      <div className="bg-surface-container-high/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 group hover:border-secondary/20 transition-all duration-300 shadow-lg flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">{t('detail.analysis.winRate')}</span>
                          <Activity className="w-4 h-4 text-on-surface-variant/20 group-hover:text-secondary/40" />
                        </div>
                        <p className="text-xl md:text-2xl font-headline font-black text-secondary tracking-tight">
                          {aiAnalysis.timelines?.[aiTab]?.winRate || aiAnalysis.winRate || 0}%
                        </p>
                      </div>

                      {(() => {
                        const isRedUp = t('settings.candle.up') === '漲';
                        const upColorClass = isRedUp ? 'text-red-500' : 'text-green-500';
                        const downColorClass = isRedUp ? 'text-green-500' : 'text-red-500';
                        const timeline = aiAnalysis.timelines?.[aiTab];

                        const cleanPrice = (p: string) => {
                          if (!p) return '--';
                          // Match numbers, commas, dots and ranges (hyphen or tilde)
                          const match = p.match(/[0-9,.]+(?:\s?[-~]\s?[0-9,.]+)?/);
                          const clean = match ? match[0] : p;
                          // Format each number found within the clean segment
                          return clean.replace(/([0-9,.]+)/g, m => {
                            const raw = m.replace(/,/g, '');
                            const n = parseFloat(raw);
                            return isNaN(n) ? m : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          });
                        };

                        if (timeline) {
                          return (
                            <>
                              <div className="bg-surface-container-high/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 group hover:border-red-500/20 transition-all duration-300 shadow-lg flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[11px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">{t('detail.analysis.stopLoss')}</span>
                                  <TrendingDown className={`w-4 h-4 opacity-20 group-hover:opacity-40 ${downColorClass}`} />
                                </div>
                                <p className={`text-xl md:text-2xl font-headline font-black tracking-tight ${downColorClass}`}>
                                  {cleanPrice(timeline.stopLoss)}
                                </p>
                              </div>
                              <div className="bg-surface-container-high/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 group hover:border-green-500/20 transition-all duration-300 shadow-lg flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[11px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">{t('detail.analysis.takeProfit')}</span>
                                  <TrendingUp className={`w-4 h-4 opacity-20 group-hover:opacity-40 ${upColorClass}`} />
                                </div>
                                <p className={`text-xl md:text-2xl font-headline font-black tracking-tight ${upColorClass}`}>
                                  {cleanPrice(timeline.target)}
                                </p>
                              </div>
                            </>
                          );
                        }

                        return null;
                      })()}
                    </div>

                    {/* Highlights List (New) */}
                    {aiAnalysis.timelines?.[aiTab]?.highlights && (
                      <div className="p-6 bg-surface-container-low/50 rounded-[2rem] border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">
                            {t('detail.analysis.highlights')}
                          </span>
                        </div>
                        <ul className="space-y-3">
                          {aiAnalysis.timelines?.[aiTab]?.highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-3 group">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0" />
                              <span className="text-sm text-on-surface-variant font-medium leading-relaxed group-hover:text-on-surface transition-colors">
                                {stripMarkdown(h)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bottom Strategy Description */}
                    <div className="p-8 bg-surface-container-low rounded-[2rem] border border-white/5 shadow-inner">
                      <div className="flex items-center gap-2 mb-4 opacity-50">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t(`ai.multi.tab.${aiTab}`)} {language === 'zh-TW' ? '策略與風險評核' : 'Tactics & Risk Assessment'}
                        </span>
                      </div>
                      <p className="text-base text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">
                        {stripMarkdown(aiAnalysis.timelines?.[aiTab]?.description || (aiTab === 'short' ? aiAnalysis.shortTerm : aiTab === 'medium' ? aiAnalysis.mediumTerm : aiAnalysis.longTerm) || '')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* 2. Integrated Deep Insights (Sentiment + Fundamentals) */}
          <section className="w-full bg-surface-container rounded-[2.5rem] p-10 shadow-2xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                <BrainCircuit className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight uppercase">{t('detail.analysis.deepInsight')}</h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Visual Sentiment Analytics */}
              <div className="flex flex-col items-center justify-center py-6 px-4">
                <SentimentPieChart
                  sentiment={aiAnalysis?.sentiment || { positive: 0, neutral: 0, negative: 0 }}
                  isLoading={isAiLoading}
                />
              </div>

              {/* Right Column: Multi-Expert Insights */}
              <div className="relative flex flex-col h-full min-h-[400px]">
                {isAiLoading ? (
                  <div className="h-full bg-on-surface/5 rounded-[2.5rem] animate-pulse" />
                ) : aiAnalysis ? (
                  <div className="group relative h-full flex flex-col xl:flex-row items-center xl:items-stretch gap-0 xl:gap-4">
                    <div className="flex-1 relative bg-surface-container/30 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl group-hover:border-white/10 transition-all duration-500 overflow-hidden w-full">
                      <div className="p-8 flex flex-col gap-10 overflow-auto h-full custom-scrollbar">
                        {/* Sub-section: News Insight */}
                        <div>
                          <div className="flex items-center gap-2 mb-4 opacity-50 uppercase tracking-[0.2em] text-[10px] font-black">
                            <Newspaper className="w-4 h-4 text-primary" />
                            <span>{t('detail.analysis.newsTitle')}</span>
                          </div>
                          <p className="text-base text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">
                            {stripMarkdown(aiAnalysis.newsSummary)}
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {/* Sub-section: Fundamental Insight */}
                        <div>
                          <div className="flex items-center gap-2 mb-4 opacity-50 uppercase tracking-[0.2em] text-[10px] font-black">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <span>{t('detail.experts.fundamental')}</span>
                          </div>
                          <p className="text-base text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">
                            {stripMarkdown(aiAnalysis.fundamentalSummary)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* 5. Global Trend Standalone */}
          <section className="w-full bg-surface-container rounded-3xl p-8 shadow-xl border border-outline-variant/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight">{t('detail.experts.trend')}</h3>
            </div>
            {isAiLoading ? (
              <div className="h-20 bg-on-surface/5 rounded-2xl animate-pulse" />
            ) : aiAnalysis ? (
              <div className="text-base text-on-surface-variant leading-relaxed bg-surface-container-low p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                {stripMarkdown(aiAnalysis.trendSummary)}
              </div>
            ) : null}
          </section>
        </div>

      </main>
    </div>
  );
}
