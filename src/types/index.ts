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
}
