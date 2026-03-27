import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Search, ArrowRight, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { searchStock, searchStockSuggestions, StockSuggestion } from '../api/yahoo';
import { useTranslation } from '../contexts/LanguageContext';

export function AnalysisTab({ onAnalyze, selectedModel, language, availableModels }: { 
  onAnalyze: (symbol: string, name: string, model: string) => void, 
  selectedModel: string, 
  language: 'zh-TW' | 'en-US',
  availableModels: { id: string, name: string }[] 
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  
  const [subModel, setSubModel] = useState(availableModels[0]?.id || '');

  useEffect(() => {
    if (availableModels.length > 0) {
      // Try to find a sensible default or just use the first one
      setSubModel(availableModels[0].id);
    } else {
      setSubModel('');
    }
  }, [availableModels]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Start suggesting from typing 1 character
      if (query.trim().length >= 1) {
        setIsSearchingSuggestions(true);
        const results = await searchStockSuggestions(query.trim(), language);
        setSuggestions(results);
        setIsSearchingSuggestions(false);
      } else {
        setSuggestions([]);
      }
    }, 300); // 300ms debounce buffer
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = async (e?: React.FormEvent, customSymbol?: string, customName?: string) => {
    if (e) e.preventDefault();

    // Use either the directly passed symbol (from dropdown) or the current input query
    const targetQuery = customSymbol || query;

    if (!targetQuery.trim()) {
      setError(t('analysis.error.empty'));
      return;
    }

    // Optimistic state updates
    if (customSymbol) setQuery(customSymbol);
    setError(null);
    setIsLoading(true);
    setShowSuggestions(false);

    // Call Yahoo API to check stock existence
    const symbol = await searchStock(targetQuery.trim(), language);

    if (symbol) {
      // Find successfully, transition to details
      // Use the name from suggestions if available, otherwise use symbol as fallback
      onAnalyze(symbol, selectedName || customName || symbol, subModel);
      setIsLoading(false);
    } else {
      setError(t('analysis.error.notFound', targetQuery));
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: StockSuggestion) => {
    // Fill the input field but do NOT submit automatically
    setQuery(suggestion.symbol);
    setSelectedName(suggestion.shortname);
    setShowSuggestions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full flex justify-center"
    >
      <div className="bg-surface-container rounded-xl py-12 px-8 shadow-none relative overflow-visible w-full max-w-md">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <form className="space-y-8 relative z-10" onSubmit={(e) => handleSubmit(e)}>
          <div className="space-y-3 text-left">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-primary ml-1">{t('analysis.layer')}</label>
            <div className="relative group">
              <select 
                value={subModel}
                onChange={(e) => setSubModel(e.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-5 pr-14 text-on-surface font-body appearance-none cursor-pointer outline-none focus:ring-1 focus:ring-primary/40 truncate"
              >
                <option value="" disabled hidden>{t('onboarding.model.label')}</option>
                {availableModels.length > 0 && availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 flex items-center gap-2 text-on-surface group-focus-within:opacity-80 transition-opacity">
                <Cpu className="w-4 h-4" />
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[10px] text-on-surface-variant/50 ml-2 mt-1 uppercase tracking-widest font-bold">
              {selectedModel === 'google' ? t('analysis.model.provider', 'Google') : selectedModel === 'openai' ? t('analysis.model.provider', 'OpenAI') : selectedModel === 'claude' ? t('analysis.model.provider', 'Anthropic') : ''}
            </div>
          </div>

          <div className="space-y-3 text-left relative z-50">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-primary ml-1">{t('analysis.identifier')}</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder={t('analysis.input.placeholder')}
                value={query}
                onFocus={() => { if (query.length >= 1) setShowSuggestions(true); }}
                // We use setTimeout for onBlur to ensure onMouseDown from dropdown fires first
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedName(null); // Clear manual selection when typing
                  setShowSuggestions(true);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                className={`w-full bg-surface-container-lowest border rounded-xl py-4 px-5 text-on-surface font-body placeholder:text-on-surface-variant/30 focus:ring-1 focus:outline-none transition-all outline-none ${error ? 'border-error/50 focus:ring-error/40 focus:border-error/40' : 'border-transparent focus:ring-secondary/40'
                  }`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isSearchingSuggestions ? (
                  <Loader2 className="w-5 h-5 text-secondary/40 animate-spin" />
                ) : (
                  <Search className={`w-5 h-5 ${error ? 'text-error/40' : 'text-secondary/40'}`} />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-surface-container border border-outline-variant/10 rounded-xl shadow-2xl z-[100] overflow-hidden drop-shadow-2xl"
                  >
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        className="w-full text-left px-5 py-3.5 hover:bg-surface-container-high border-b border-outline-variant/5 last:border-0 flex justify-between items-center transition-colors cursor-pointer group"
                        onMouseDown={() => handleSelectSuggestion(s)}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-primary group-hover:text-primary-container transition-colors tracking-wide">{s.symbol}</span>
                          <span className="text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors truncate max-w-[200px] mt-0.5">{s.shortname}</span>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-on-surface-variant/70 bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant/5 shadow-sm">
                          {s.exchDisp}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="flex items-center gap-1.5 text-error mt-2 ml-1"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-br from-primary to-primary-container py-5 rounded-xl text-on-primary font-headline font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-80 disabled:active:scale-100 disabled:hover:brightness-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-on-primary" />
                <span>{t('analysis.button.searching')}</span>
              </>
            ) : (
              <>
                <span>{t('analysis.button.start')}</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
