export type ScreenState = 'onboarding' | 'main' | 'detail' | 'settings';
export type TabState = 'analysis' | 'history';

export interface HistoryRecord {
  symbol: string;
  name: string;
  timestamp: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Correction';
}

export interface AIAnalysis {
  recommendation: string; // "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"
  confidence: number; // 0-100
  targetPrice: string; // $1200 or Range
  sentiment: { 
    positive: number; // 0-1
    neutral: number; // 0-1
    negative: number; // 0-1
  };
  shortTerm: string;
  mediumTerm: string;
  longTerm: string;
  summary: string;
  // Strategic Fields
  entryPrice?: string;
  exitPrice?: string;
  winRate?: number;
  fundamentalSummary?: string;
  newsSummary?: string;
  trendSummary?: string;
}

export interface AnalysisRecord {
  id: string;
  symbol: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  timestamp: number;
  price: number;
  changePercent: number;
  analysis?: AIAnalysis;
  ohlcv?: Record<string, any[]>; // Maps resolution to candles
  indicators?: Record<string, any>; // Technical indicators for the stock
  model: string;
  language?: string;
}
