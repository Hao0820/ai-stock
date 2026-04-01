import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, LineChart, Calendar, ChevronRight, History, Trash2, ShieldAlert, Clock, BrainCircuit, X, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { AnalysisRecord } from '../types';
import { analysisDb } from '../utils/db';
import { ConfirmModal } from './ConfirmModal';

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
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    // Subscribe to live DB updates (including background AI back-fills)
    const unsubscribe = analysisDb.subscribe(loadRecords);
    return () => unsubscribe();
  }, []);

  const handleClear = async () => {
    if (isEditMode) {
      if (selectedIds.size === 0) return;
      const idsToDelete = Array.from(selectedIds);
      await Promise.all(idsToDelete.map((id: string) => analysisDb.deleteRecord(id)));
      setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setIsEditMode(false);
    } else {
      await analysisDb.clearAll();
      setRecords([]);
    }
    setIsClearConfirmOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  };

  const getSentimentInfo = (record: AnalysisRecord) => {
    if (!record.analysis) {
      return { 
        label: 'Processing', 
        icon: <Loader2 className="w-5 h-5 text-on-surface-variant/40 animate-spin" />, 
        style: 'bg-on-surface/5 text-on-surface-variant/60' 
      };
    }
    const s = record.analysis.sentiment;
    if (s.positive >= 0.6) return { label: 'Bullish', icon: <TrendingUp className="w-5 h-5 text-primary" />, style: 'bg-primary/10 text-primary' };
    if (s.negative >= 0.4) return { label: 'Bearish', icon: <TrendingDown className="w-5 h-5 text-error" />, style: 'bg-error/10 text-error' };
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
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isEditMode ? (
                <>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={exitEditMode}
                    className="p-3 text-on-surface-variant hover:bg-surface-container-high rounded-2xl transition-all active:scale-95 flex items-center gap-2 px-4 text-xs font-bold"
                  >
                    <X className="w-4 h-4" />
                    {t('common.cancel')}
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onClick={() => setIsClearConfirmOpen(true)}
                    disabled={selectedIds.size === 0}
                    className={`p-3 rounded-2xl transition-all active:scale-95 flex items-center gap-2 px-4 text-xs font-bold shadow-lg ${
                      selectedIds.size > 0 
                        ? 'bg-error text-on-error hover:bg-error/90' 
                        : 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {selectedIds.size === records.length 
                      ? t('history.clear.button') 
                      : t('history.delete.selected').replace('{0}', selectedIds.size.toString())}
                  </motion.button>
                </>
              ) : (
                <motion.button 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setIsEditMode(true)}
                  className="p-3 text-on-surface-variant hover:text-primary transition-all bg-surface-container-high rounded-2xl active:scale-95 group shadow-lg"
                >
                  <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
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
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    if (isEditMode) {
                      toggleSelect(record.id);
                    } else {
                      onViewRecord(record.id);
                    }
                  }}
                  className={`group relative overflow-hidden bg-surface-container rounded-3xl p-6 transition-all duration-300 cursor-pointer border shadow-lg ${
                    isEditMode && selectedIds.has(record.id)
                      ? 'border-primary bg-primary/5 shadow-primary/5'
                      : 'border-outline-variant/5 hover:border-primary/20 hover:bg-surface-container-high hover:shadow-primary/5'
                  }`}
                >
                  <div className="flex items-center w-full">
                    {/* Multi-select checkmark */}
                    <AnimatePresence>
                      {isEditMode && (
                        <motion.div
                          initial={{ width: 0, opacity: 0, marginRight: 0 }}
                          animate={{ width: 'auto', opacity: 1, marginRight: 16 }}
                          exit={{ width: 0, opacity: 0, marginRight: 0 }}
                          className="shrink-0"
                        >
                          {selectedIds.has(record.id) ? (
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                          ) : (
                            <Circle className="w-6 h-6 text-on-surface-variant/20" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Left & Center Information */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                        {sentiment.icon}
                      </div>
                      
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                          <span className="font-headline font-bold text-lg sm:text-xl text-on-surface tracking-tight truncate shrink-0">
                            {record.symbol}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase ${sentiment.style}`}>
                            {t(`history.sentiment.${sentiment.label.toLowerCase()}` as any)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-on-surface-variant/80 font-medium truncate max-w-[150px] md:max-w-xs mb-1">
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
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-headline font-extrabold text-on-surface tracking-tighter">
                            ${record.price?.toFixed(2)}
                          </span>
                          {record.changePercent !== undefined && (
                            <span className={`text-[11px] font-bold whitespace-nowrap mt-0.5 ${
                              record.changePercent >= 0 
                                ? (candleColorStyle === 'red-up' ? 'text-red-500' : 'text-green-500')
                                : (candleColorStyle === 'red-up' ? 'text-green-500' : 'text-red-500')
                            }`}>
                              {record.changePercent >= 0 ? '▲' : '▼'} {Math.abs(record.changePercent).toFixed(2)}%
                            </span>
                          )}
                        </div>
                        {!isEditMode && <ChevronRight className="w-5 h-5 text-on-surface-variant/20 group-hover:text-primary transition-all group-hover:translate-x-1" />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </AnimatePresence>

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClear}
        type="danger"
        title={t('history.clear.confirm.title')}
        message={
          isEditMode && selectedIds.size < records.length
            ? t('history.delete.confirm.selected').replace('{0}', selectedIds.size.toString())
            : t('history.clear.confirm.message')
        }
        confirmLabel={t('history.clear.button')}
        cancelLabel={t('common.cancel')}
      />
    </motion.div>
  );
}
