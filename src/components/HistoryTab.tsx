import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, LineChart, Calendar, ChevronRight, History, Trash2, ShieldAlert, Clock, BrainCircuit } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { AnalysisRecord } from '../types';
import { analysisDb } from '../utils/db';

export function HistoryTab({ 
  onViewRecord,
  candleColorStyle = 'red-up'
}: { 
  onViewRecord: (recordId: string) => void;
  candleColorStyle?: 'red-up' | 'green-up';
}) {
  const { t, language } = useTranslation();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const data = await analysisDb.getAllRecords();
        setRecords(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  const handleClear = async () => {
    if (confirm(t('settings.danger.reset.confirm'))) {
      await analysisDb.clearAll();
      setRecords([]);
    }
  };

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await analysisDb.deleteRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getSentimentInfo = (record: AnalysisRecord) => {
    const s = record.analysis.sentiment;
    if (s.positive > 0.6) return { label: 'Bullish', icon: <TrendingUp className="w-5 h-5 text-primary" />, style: 'bg-primary/10 text-primary' };
    if (s.negative > 0.4) return { label: 'Bearish', icon: <TrendingDown className="w-5 h-5 text-error" />, style: 'bg-error/10 text-error' };
    return { label: 'Neutral', icon: <LineChart className="w-5 h-5 text-secondary" />, style: 'bg-secondary/10 text-secondary' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="mb-10 flex justify-between items-end px-2">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">{t('nav.tab.history')}</h2>
          <p className="text-on-surface-variant mt-2 text-sm">{t('history.subtitle')}</p>
        </div>
        
        {records.length > 0 && (
          <button 
            onClick={handleClear}
            className="p-3 text-on-surface-variant hover:text-error transition-all bg-surface-container-high rounded-2xl active:scale-95 group shadow-lg"
          >
            <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-28 bg-surface-container rounded-3xl animate-pulse" />)}
            </div>
          ) : records.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-surface-container-low rounded-[2.5rem] p-12 flex flex-col items-center text-center border font-body border-outline-variant/10 shadow-inner"
            >
              <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-8">
                <History className="w-10 h-10 text-on-surface-variant/20" />
              </div>
              <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">{t('history.empty.title')}</h3>
              <p className="text-on-surface-variant text-sm max-w-sm mx-auto leading-relaxed opacity-70">
                {t('history.empty.desc')}
              </p>
              
              <div className="mt-10 flex items-center gap-2 text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-[0.2em] bg-surface-container-high/50 px-6 py-2.5 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5" />
                IndexedDB Persistent Enclave
              </div>
            </motion.div>
          ) : (
            records.map((record) => {
              const sentiment = getSentimentInfo(record);
              const date = new Date(record.timestamp);
              return (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => onViewRecord(record.id)}
                  className="group relative overflow-hidden bg-surface-container rounded-3xl p-6 transition-all hover:bg-surface-container-high active:scale-[0.99] duration-300 cursor-pointer border border-outline-variant/5 hover:border-primary/20 shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex justify-between items-center w-full">
                    {/* Left & Center Information */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                        {sentiment.icon}
                      </div>
                      
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-headline font-bold text-xl text-on-surface tracking-tight truncate">
                            {record.symbol}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase ${sentiment.style}`}>
                            {t(`history.sentiment.${sentiment.label.toLowerCase()}` as any)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-on-surface-variant/80 font-medium truncate max-w-[180px] md:max-w-xs mb-1">
                          {language === 'zh-TW' ? (record.nameZh || record.name) : (record.nameEn || record.name)}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Summary */}
                    <div className="flex flex-col items-end shrink-0 ml-4 min-w-[80px]">
                      <span className="text-[9px] text-on-surface-variant font-bold opacity-30 uppercase tracking-[0.2em] mb-1">
                        {record.model.split('/').pop()}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-headline font-extrabold text-on-surface tracking-tighter">
                            ${record.price?.toFixed(0)}
                          </span>
                          {record.changePercent !== undefined && (
                            <span className={`text-sm font-bold whitespace-nowrap ${
                              record.changePercent >= 0 
                                ? (candleColorStyle === 'red-up' ? 'text-red-500' : 'text-green-500')
                                : (candleColorStyle === 'red-up' ? 'text-green-500' : 'text-red-500')
                            }`}>
                              ({record.changePercent >= 0 ? '+' : ''}{record.changePercent.toFixed(2)}%)
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-on-surface-variant/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                    </div>

                    {/* Corner Delete Action */}
                    <button 
                      onClick={(e) => deleteOne(e, record.id)}
                      className="absolute -right-4 -top-4 p-5 bg-error/10 text-error rounded-bl-3xl opacity-0 group-hover:opacity-100 group-hover:right-0 group-hover:top-0 transition-all active:scale-95 duration-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </AnimatePresence>
    </motion.div>
  );
}
