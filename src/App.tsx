import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ScreenState, TabState } from './types';
import { TopNav } from './components/TopNav';
import { BottomNav } from './components/BottomNav';
import { AnalysisTab } from './components/AnalysisTab';
import { HistoryTab } from './components/HistoryTab';
import { OnboardingScreen } from './pages/OnboardingScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import { DetailScreen } from './pages/DetailScreen';
import { useTranslation } from './contexts/LanguageContext';
import { useHistory } from './hooks/useHistory';
import { clearAllStockCache } from './utils/cache';

export default function App() {
  const [hasVisited, setHasVisited] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ai-stock-visited') === 'true';
    } catch {
      return false;
    }
  });

  const initialScreen = (() => {
    try {
      const savedVisited = localStorage.getItem('ai-stock-visited') === 'true';
      if (!savedVisited) return 'onboarding';

      const savedKeys = localStorage.getItem('ai-stock-keys');
      if (savedKeys) {
        const keys = JSON.parse(savedKeys);
        if (keys.google || keys.openai || keys.claude) {
          return 'main';
        }
      }
    } catch { }
    return 'onboarding';
  })();

  const [currentScreen, setCurrentScreen] = useState<ScreenState>(initialScreen);
  const [lastParentScreen, setLastParentScreen] = useState<ScreenState>(initialScreen);
  const [activeTab, setActiveTab] = useState<TabState>('analysis');
  const [selectedStock, setSelectedStock] = useState<{ symbol: string, name: string } | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeSubModel, setActiveSubModel] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [selectedModel, setSelectedModel] = useState('google');
  const [apiKeys, setApiKeys] = useState<{ google: string, openai: string, claude: string }>(() => {
    try {
      const saved = localStorage.getItem('ai-stock-keys');
      const parsed = saved ? JSON.parse(saved) : { google: '', openai: '', claude: '' };
      
      // Sanitization: Ensure it's an object with the expected keys
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        return { google: '', openai: '', claude: '' };
      }
      
      const cleanKey = (key: any, provider: string) => {
        if (typeof key !== 'string') return '';
        let k = key.trim();
        
        // Detection: If a single field contains multiple distinct key patterns, it's corrupted
        const patterns = [/AIzaSy[A-Za-z0-9_-]+/, /sk-[A-Za-z0-9]{40,}/, /ant-api[A-Za-z0-9_-]{50,}/];
        let matchCount = 0;
        patterns.forEach(p => {
          const matches = k.match(new RegExp(p, 'g'));
          if (matches) matchCount += matches.length;
        });

        if (matchCount > 1) {
          console.warn(`[AI Client] Corrupted key detected for ${provider}, purging...`);
          return '';
        }

        // Specific Extraction
        if (provider === 'google') {
           const match = k.match(/AIzaSy[A-Za-z0-9_-]{33,45}/);
           return match ? match[0] : '';
        } else if (provider === 'openai') {
           const match = k.match(/sk-[A-Za-z0-9]{40,60}/);
           return match ? match[0] : '';
        } else if (provider === 'claude') {
           const match = k.match(/ant-api[A-Za-z0-9_-]{80,}/);
           return match ? match[0] : '';
        }
        
        return k;
      };

      return {
        google: cleanKey(parsed.google, 'google'),
        openai: cleanKey(parsed.openai, 'openai'),
        claude: cleanKey(parsed.claude, 'claude')
      };
    } catch {
      return { google: '', openai: '', claude: '' };
    }
  });

  // Dynamic available models state
  const [availableModels, setAvailableModels] = useState<Record<string, { id: string, name: string }[]>>(() => {
    try {
      const saved = localStorage.getItem('ai-stock-models');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [candleColorStyle, setCandleColorStyle] = useState<'red-up' | 'green-up'>('red-up');
  const { t, language, setLanguage } = useTranslation();
  const { history, addHistory, clearHistory } = useHistory();

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('ai-stock-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('ai-stock-models', JSON.stringify(availableModels));
  }, [availableModels]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const handleStartAnalysis = () => {
    setHasVisited(true);
    localStorage.setItem('ai-stock-visited', 'true');
    setCurrentScreen('main');
    setLastParentScreen('main');
  };

  const handleViewDetail = (symbol: string, name: string, model?: string) => {
    setSelectedStock({ symbol, name });
    setSelectedRecordId(null); // Clear record if we are doing a new search
    if (model) setActiveSubModel(model);
    setLastParentScreen('main');
    setCurrentScreen('detail');
  };

  const handleViewRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    setLastParentScreen('main');
    setCurrentScreen('detail');
  };

  const handleOpenSettings = () => {
    setLastParentScreen(currentScreen);
    setCurrentScreen('settings');
  };

  const handleFullReset = () => {
    // Clear state
    setApiKeys({ google: '', openai: '', claude: '' });
    setAvailableModels({});
    setTheme('dark');
    setLanguage('zh-TW');
    setCandleColorStyle('red-up');

    // Clear localStorage
    localStorage.removeItem('ai-stock-keys');
    localStorage.removeItem('ai-stock-models');
    localStorage.removeItem('ai-stock-visited');
    clearHistory();
    import('./utils/db').then(m => m.analysisDb.clearAll());
    clearAllStockCache();

    setHasVisited(false);
    showToast(t('common.toast.success.updated'), 'success');
    setCurrentScreen('onboarding');
  };

  const handleBack = () => {
    if (currentScreen === 'settings') {
      setCurrentScreen(lastParentScreen);
      // Do NOT clear selectedStock/recordId when just returning from settings
    } else {
      setCurrentScreen('main');
      setSelectedStock(null);
      setSelectedRecordId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <OnboardingScreen
              onStart={handleStartAnalysis}
              onSettingsClick={handleOpenSettings}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              onSuccess={(msg, type) => showToast(msg, type || 'success')}
              setAvailableModels={setAvailableModels}
            />
          </motion.div>
        )}

        {currentScreen === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col"
          >
            <TopNav onSettingsClick={handleOpenSettings} />
            <main className="flex-grow flex flex-col items-center px-6 max-w-lg mx-auto w-full pt-36 pb-[22vh]">
              <div className="my-auto w-full flex flex-col items-center">
                {activeTab === 'analysis' ? (
                  <AnalysisTab
                    onAnalyze={handleViewDetail}
                    selectedModel={selectedModel}
                    language={language}
                    availableModels={availableModels[selectedModel] || []}
                  />
                ) : (
                  <HistoryTab onViewRecord={handleViewRecord} candleColorStyle={candleColorStyle} />
                )}
              </div>
            </main>
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </motion.div>
        )}

        {currentScreen === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <SettingsScreen
              onBack={handleBack}
              theme={theme}
              setTheme={setTheme}
              candleColorStyle={candleColorStyle}
              setCandleColorStyle={setCandleColorStyle}
              language={language as any}
              setLanguage={setLanguage as any}
              onSuccess={(msg) => showToast(msg, 'success')}
              onFullReset={handleFullReset}
            />
          </motion.div>
        )}

        {currentScreen === 'detail' && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <DetailScreen
              stock={selectedStock?.symbol || '2330.TW'}
              initialName={selectedStock?.name}
              recordId={selectedRecordId}
              onBack={handleBack}
              onSettingsClick={handleOpenSettings}
              candleColorStyle={candleColorStyle}
              apiKeys={apiKeys}
              selectedModel={selectedModel}
              subModel={activeSubModel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[9999] w-full max-w-sm px-4"
          >
            <div className="bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-primary/20 text-primary' :
                  toast.type === 'error' ? 'bg-error/20 text-error' : 'bg-secondary/20 text-secondary'
                }`}>
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-bold text-on-surface truncate">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 hover:bg-on-surface/5 rounded-lg text-on-surface-variant transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
