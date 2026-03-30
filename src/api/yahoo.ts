import { calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI, calculateKD, calculateMACD } from '../utils/indicators';

export interface YahooChartResponse {
  chart: {
    result: {
      meta: {
        symbol: string;
        longName?: string;
        shortName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
      };
      timestamp: number[];
      indicators: {
        quote: {
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }[];
      };
    }[] | null;
    error: any;
  };
}

export interface ProcessedChartData {
  time: string;
  originalTimestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  priceRange: [number, number]; // [low, high] for the Bar component representing the candlestick wick
  ma5: number | null;
  ema12: number | null;
  bbMiddle: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi14: number | null;
  k9: number | null;
  d9: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  isUp: boolean; // Indicates if close >= open (true = red/Taiwan standard, false = green)
}

export interface StockFundamentals {
  symbol: string;
  assetProfile?: any;
  financialData?: any;
  defaultKeyStatistics?: any;
  summaryDetail?: any;
  recommendationTrend?: any;
  earnings?: any;
}

export interface StockDetailResult {
  symbol: string;
  name: string;
  price: number;
  changeValue: number;
  changePercent: number;
  chartData: ProcessedChartData[];
  fundamentals?: StockFundamentals;
}

/**
 * Fetch fundamental data (P/E, ROE, Revenue Growth, etc.) from Yahoo Finance v10.
 * Now includes a fallback to v7 quote API for more reliable basic metrics.
 */
export async function fetchStockFundamentals(symbol: string, language: 'zh-TW' | 'en-US' = 'zh-TW'): Promise<StockFundamentals | null> {
  if (!symbol) return null;
  const targetSymbol = symbol.trim().toUpperCase();
  const modules = 'assetProfile,financialData,defaultKeyStatistics,summaryDetail,recommendationTrend,earnings';
  
  try {
    const langParam = language === 'zh-TW' ? 'zh-Hant-TW' : 'en-US';
    const regionParam = language === 'zh-TW' ? 'TW' : 'US';
    
    // Concurrent fetch for robustness
    const [summaryRes, quoteRes] = await Promise.all([
      fetch(`/api/yahoo/v10/finance/quoteSummary/${encodeURIComponent(targetSymbol)}?modules=${modules}&lang=${langParam}&region=${regionParam}`),
      fetch(`/api/yahoo/v7/finance/quote?symbols=${encodeURIComponent(targetSymbol)}&lang=${langParam}&region=${regionParam}`)
    ]);
    
    let result: any = null;
    let quoteData: any = null;

    if (summaryRes.ok) {
      const summaryJson = await summaryRes.json();
      result = summaryJson.quoteSummary?.result?.[0] || {};
    }

    if (quoteRes.ok) {
      const quoteJson = await quoteRes.json();
      quoteData = quoteJson.finance?.result?.[0] || {};
    }

    if (!result && !quoteData) return null;
    
    // Create base fundamentals
    const fundamentals: StockFundamentals = {
      symbol: targetSymbol,
      assetProfile: result?.assetProfile,
      financialData: result?.financialData || {},
      defaultKeyStatistics: result?.defaultKeyStatistics || {},
      summaryDetail: result?.summaryDetail || {},
      recommendationTrend: result?.recommendationTrend || {},
      earnings: result?.earnings || {}
    };

    // Fallback/Augmentation logic from quoteData
    if (quoteData) {
      // P/E Fallback
      if (!fundamentals.summaryDetail.forwardPE && quoteData.forwardPE) {
        fundamentals.summaryDetail.forwardPE = { raw: quoteData.forwardPE, fmt: String(quoteData.forwardPE) };
      }
      if (!fundamentals.summaryDetail.trailingPE && quoteData.trailingPE) {
        fundamentals.summaryDetail.trailingPE = { raw: quoteData.trailingPE, fmt: String(quoteData.trailingPE) };
      }
      
      // Recommendation Fallback
      if (!fundamentals.financialData.recommendationKey && quoteData.averageAnalystRating) {
        // Map "1.5 - Buy" to "buy"
        const rating = quoteData.averageAnalystRating.toLowerCase();
        if (rating.includes('buy')) fundamentals.financialData.recommendationKey = 'buy';
        else if (rating.includes('sell')) fundamentals.financialData.recommendationKey = 'sell';
        else if (rating.includes('hold')) fundamentals.financialData.recommendationKey = 'hold';
      }

      // Target Price Fallback
      if (!fundamentals.financialData.targetMeanPrice && quoteData.targetPriceMean) {
         fundamentals.financialData.targetMeanPrice = { raw: quoteData.targetPriceMean, fmt: String(quoteData.targetPriceMean) };
      }
    }

    return fundamentals;
  } catch (error) {
    console.error(`[Yahoo] Error fetching fundamentals for ${targetSymbol}:`, error);
    return null;
  }
}

export interface StockSuggestion {
  symbol: string;
  shortname: string;
  exchDisp: string;
}

export async function searchStockSuggestions(query: string, language: 'zh-TW' | 'en-US' = 'zh-TW'): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) return [];
  try {
    const langParam = language === 'zh-TW' ? 'zh-Hant-TW' : 'en-US';
    const regionParam = language === 'zh-TW' ? 'TW' : 'US';
    // Using v6 autocomplete for better localized search support
    const res = await fetch(`/api/yahoo/v6/finance/autocomplete?query=${encodeURIComponent(query)}&lang=${langParam}&region=${regionParam}`);
    if (!res.ok) return [];
    
    const data = await res.json();
    const suggestions = data.ResultSet?.Result || [];

    if (suggestions.length > 0) {
      return suggestions.map((q: any) => ({
        symbol: q.symbol,
        shortname: q.name || q.symbol,
        exchDisp: q.exchDisp || q.exch || ''
      }));
    }
  } catch (error) {
    console.error('Error fetching suggestions (v6):', error);
  }
  return [];
}

/**
 * Check if a given stock symbol exists or resolve a name to a symbol.
 */
export async function searchStock(query: string, language: 'zh-TW' | 'en-US' = 'zh-TW'): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Detection: If query contains Non-ASCII (e.g., Chinese), it's likely a name
  const isPlainSymbol = /^[A-Z0-9.]+$/i.test(trimmed);
  
  let targetSymbol = trimmed;

  if (!isPlainSymbol) {
    // Attempt name-to-symbol resolution via suggestions
    const suggestions = await searchStockSuggestions(trimmed, language);
    if (suggestions.length > 0) {
      targetSymbol = suggestions[0].symbol;
    }
  }

  const result = await fetchStockDetail(targetSymbol, '1d', '1d', language);
  return result ? result.symbol : null;
}

/**
 * In-memory cache for stock detail results to prevent redundant API calls
 */
const stockCache: Record<string, { data: StockDetailResult, timestamp: number }> = {};
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Fetch historical chart data and process technical indicators.
 */
export async function fetchStockDetail(symbol: string, range: string = '1mo', interval: string = '1d', language: 'zh-TW' | 'en-US' = 'zh-TW'): Promise<StockDetailResult | null> {
  if (!symbol) return null;
  const targetSymbol = symbol.trim().toUpperCase();
  const cacheKey = `${targetSymbol}_${range}_${interval}_${language}`;

  // Check in-memory cache first
  const cached = stockCache[cacheKey];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Yahoo] Returning cached data for ${cacheKey}`);
    return cached.data;
  }
  
  try {
    const langParam = language === 'zh-TW' ? 'zh-Hant-TW' : 'en-US';
    const regionParam = language === 'zh-TW' ? 'TW' : 'US';
    const res = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=${interval}&range=${range}&lang=${langParam}&region=${regionParam}`);
    if (!res.ok) throw new Error('API Request Failed');
    
    const data: YahooChartResponse = await res.json();
    
    if (!data.chart.result || data.chart.result.length === 0) {
      return null;
    }
    
    const chartResult = data.chart.result[0];
    const timestamps = chartResult.timestamp;
    const meta = chartResult.meta;
    const quote = (chartResult.indicators.quote && chartResult.indicators.quote[0]) ? chartResult.indicators.quote[0] : {} as any;
    
    // Validate if it's a dead/delisted stock that returns empty indicators
    if (!timestamps || timestamps.length === 0) {
      return null;
    }

    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const cleanTimestamps: number[] = [];
    const cleanOpens: number[] = [];
    const cleanHighs: number[] = [];
    const cleanLows: number[] = [];
    const cleanCloses: number[] = [];
    const cleanVolumes: number[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] === null || closes[i] === undefined || highs[i] === null || lows[i] === null) continue;
      cleanTimestamps.push(timestamps[i]);
      cleanOpens.push(opens[i]);
      cleanHighs.push(highs[i]);
      cleanLows.push(lows[i]);
      cleanCloses.push(closes[i]);
      cleanVolumes.push(volumes[i] || 0);
    }

    const ma5 = calculateSMA(cleanCloses, 5);
    const ema12 = calculateEMA(cleanCloses, 12);
    const bb = calculateBollingerBands(cleanCloses, 21, 2.1);
    const rsi14 = calculateRSI(cleanCloses, 14);
    const kd = calculateKD(cleanHighs, cleanLows, cleanCloses, 9);
    const macd = calculateMACD(cleanCloses, 12, 26, 9);
    
    const chartData: ProcessedChartData[] = [];
    
    for (let i = 0; i < cleanTimestamps.length; i++) {
      const date = new Date(cleanTimestamps[i] * 1000);
      let timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (interval.includes('m') || interval.includes('h')) {
        timeStr += ` ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      } else if (interval === '1mo' || interval === '1wk') {
           if (interval === '1mo') {
             timeStr = date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
           } else {
             timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
           }
      } else if (range === '1y' || range === 'max') {
           timeStr = date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
      }

      const open = Number(cleanOpens[i]?.toFixed(2)) || 0;
      const high = Number(cleanHighs[i]?.toFixed(2)) || 0;
      const low = Number(cleanLows[i]?.toFixed(2)) || 0;
      const close = Number(cleanCloses[i]?.toFixed(2)) || 0;

      chartData.push({
        time: timeStr,
        originalTimestamp: cleanTimestamps[i],
        open,
        high,
        low,
        close,
        volume: cleanVolumes[i] || 0,
        priceRange: [low, high],
        ma5: ma5[i] ? Number(ma5[i]!.toFixed(2)) : null,
        ema12: ema12[i] ? Number(ema12[i]!.toFixed(2)) : null,
        bbMiddle: bb.middle[i] ? Number(bb.middle[i]!.toFixed(2)) : null,
        bbUpper: bb.upper[i] ? Number(bb.upper[i]!.toFixed(2)) : null,
        bbLower: bb.lower[i] ? Number(bb.lower[i]!.toFixed(2)) : null,
        rsi14: rsi14[i] ? Number(rsi14[i]!.toFixed(2)) : null,
        k9: kd.k[i] ? Number(kd.k[i]!.toFixed(2)) : null,
        d9: kd.d[i] ? Number(kd.d[i]!.toFixed(2)) : null,
        macdLine: macd.macd[i] ? Number(macd.macd[i]!.toFixed(3)) : null,
        macdSignal: macd.signal[i] ? Number(macd.signal[i]!.toFixed(3)) : null,
        macdHist: macd.histogram[i] ? Number(macd.histogram[i]!.toFixed(3)) : null,
        isUp: close >= open
      });
    }

    const lastClose = cleanCloses.length > 0 ? cleanCloses[cleanCloses.length - 1] : 0;
    const prevClose = cleanCloses.length > 1 ? cleanCloses[cleanCloses.length - 2] : lastClose;
    const price = meta.regularMarketPrice || lastClose;
    const changeValue = price - prevClose;
    const changePercent = prevClose ? (changeValue / prevClose) * 100 : 0;

    const result: StockDetailResult = {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      price: Number(price.toFixed(2)),
      changeValue: Number(changeValue.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      chartData
    };

    // Save to cache
    stockCache[cacheKey] = { data: result, timestamp: Date.now() };

    return result;
    
  } catch (error) {
    console.error('Error fetching chart data from Yahoo Finance:', error);
    return null;
  }
}

/**
 * Fetch both English and Chinese names for a specific symbol using the search API.
 */
export async function fetchLocalizedNames(symbol: string): Promise<{ en: string, zh: string }> {
  try {
    const [enRes, zhRes] = await Promise.all([
      searchStockSuggestions(symbol, 'en-US'),
      searchStockSuggestions(symbol, 'zh-TW')
    ]);
    
    // Find exact match or default to first suggestion
    const enMatch = enRes.find(q => q.symbol.toUpperCase() === symbol.toUpperCase()) || enRes[0];
    const zhMatch = zhRes.find(q => q.symbol.toUpperCase() === symbol.toUpperCase()) || zhRes[0];
    
    return {
      en: enMatch?.shortname || symbol,
      zh: zhMatch?.shortname || symbol
    };
  } catch (err) {
    console.error('Error fetching localized names:', err);
    return { en: symbol, zh: symbol };
  }
}

/**
 * Clears the in-memory stock cache (used during full reset)
 */
export function clearYahooCache(): void {
  Object.keys(stockCache).forEach(key => delete stockCache[key]);
  console.log('[Yahoo] Cache cleared');
}
