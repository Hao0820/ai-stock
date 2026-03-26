import { useState, useEffect } from 'react';
import { HistoryRecord } from '../types';

const HISTORY_KEY = 'ai-stock-history';
const MAX_HISTORY = 50;

export function useHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const addHistory = (record: Omit<HistoryRecord, 'timestamp' | 'sentiment'>) => {
    setHistory(prev => {
      // Remove duplicate if it exists, to bring it to the top
      const filtered = prev.filter(item => item.symbol !== record.symbol);
      
      const sentiments = ['Bullish', 'Bearish', 'Neutral', 'Correction'] as const;
      const randomSentiment = sentiments[Math.floor(Math.random() * 4)];
      
      const newRecord: HistoryRecord = {
        ...record,
        timestamp: Date.now(),
        sentiment: randomSentiment,
      };
      
      return [newRecord, ...filtered].slice(0, MAX_HISTORY);
    });
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return { history, addHistory, clearHistory };
}
