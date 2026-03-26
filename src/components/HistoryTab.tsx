import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, LineChart, Calendar, ChevronRight, History, Trash2, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { HistoryRecord } from '../types';

export function HistoryTab({ 
  onViewDetail, 
  history,
  onClear
}: { 
  onViewDetail: (symbol: string, name: string) => void;
  history: HistoryRecord[];
  onClear: () => void;
}) {
  const { t } = useTranslation();

  const getSentimentIcon = (sentiment: HistoryRecord['sentiment']) => {
    switch (sentiment) {
      case 'Bullish': return <TrendingUp className="w-6 h-6 text-primary" />;
      case 'Bearish': return <TrendingDown className="w-6 h-6 text-tertiary-container" />;
      case 'Correction': return <TrendingDown className="w-6 h-6 text-tertiary-container" />;
      default: return <LineChart className="w-6 h-6 text-secondary" />;
    }
  };

  const getSentimentStyle = (sentiment: HistoryRecord['sentiment']) => {
    switch (sentiment) {
      case 'Bullish': return 'bg-primary/10 text-primary';
      case 'Bearish': return 'bg-error-container/20 text-tertiary-container';
      case 'Correction': return 'bg-error-container/20 text-tertiary-container';
      default: return 'bg-secondary/10 text-secondary';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">{t('history.title')}</h2>
          <p className="text-on-surface-variant mt-2 text-sm">{t('history.subtitle')}</p>
        </div>
        
        {history.length > 0 && (
          <button 
            onClick={onClear}
            className="p-2 text-on-surface-variant hover:text-error transition-colors bg-surface-container-high rounded-lg active:scale-95"
            title="Clear History"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {history.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-surface-container-low rounded-3xl p-10 flex flex-col items-center text-center border font-body border-outline-variant/10 shadow-inner"
            >
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
                <History className="w-8 h-8 text-on-surface-variant/40" />
              </div>
              <h3 className="font-headline font-bold text-xl text-on-surface mb-2">{t('history.empty.title')}</h3>
              <p className="text-on-surface-variant text-sm max-w-sm mx-auto leading-relaxed">
                {t('history.empty.desc')}
              </p>
              
              <div className="mt-8 flex items-center gap-2 text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest bg-surface-container-high/50 px-4 py-2 rounded-full">
                <ShieldAlert className="w-3 h-3" />
                Local Storage Enclave
              </div>
            </motion.div>
          ) : (
            history.map((record) => (
              <motion.div 
                key={record.symbol}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onViewDetail(record.symbol, record.name)}
                className="group relative overflow-hidden bg-surface-container rounded-xl p-6 transition-all hover:bg-surface-container-high active:scale-[0.98] duration-200 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-lowest flex items-center justify-center">
                      {getSentimentIcon(record.sentiment)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline font-bold text-lg text-on-surface">{record.symbol}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getSentimentStyle(record.sentiment)}`}>
                          {t(`history.sentiment.${record.sentiment.toLowerCase()}` as any)}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant font-medium mt-0.5">{record.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="w-3.5 h-3.5 text-outline" />
                        <span className="text-xs text-outline font-medium uppercase tracking-wider">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center self-center h-full">
                    <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </AnimatePresence>
    </motion.div>
  );
}
