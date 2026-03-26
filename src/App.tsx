import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenState, TabState } from './types';
import { TopNav } from './components/TopNav';
import { BottomNav } from './components/BottomNav';
import { AnalysisTab } from './components/AnalysisTab';
import { HistoryTab } from './components/HistoryTab';
import { OnboardingScreen } from './pages/OnboardingScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import { DetailScreen } from './pages/DetailScreen';
import { useTranslation } from './contexts/LanguageContext';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('onboarding');
  const [activeTab, setActiveTab] = useState<TabState>('analysis');
  const [selectedStock, setSelectedStock] = useState<{ symbol: string, name: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [selectedModel, setSelectedModel] = useState('google');
  const [apiKeys, setApiKeys] = useState<{ google: string, openai: string, claude: string }>(() => {
    try {
      const saved = localStorage.getItem('ai-stock-keys');
      return saved ? JSON.parse(saved) : { google: '', openai: '', claude: '' };
    } catch {
      return { google: '', openai: '', claude: '' };
    }
  });
  const [candleColorStyle, setCandleColorStyle] = useState<'red-up' | 'green-up'>('red-up');
  const { language, setLanguage } = useTranslation();

  useEffect(() => {
    localStorage.setItem('ai-stock-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const handleStartAnalysis = () => {
    setCurrentScreen('main');
  };

  const handleViewDetail = (symbol: string, name: string) => {
    setSelectedStock({ symbol, name });
    setCurrentScreen('detail');
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleBack = () => {
    setCurrentScreen('main');
    setSelectedStock(null);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <OnboardingScreen 
              onStart={handleStartAnalysis} 
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
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
                  />
                ) : (
                  <HistoryTab onViewDetail={handleViewDetail} />
                )}
              </div>
            </main>
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </motion.div>
        )}

        {currentScreen === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SettingsScreen 
              onBack={handleBack}
              theme={theme} 
              setTheme={setTheme} 
              selectedModel={selectedModel} 
              setSelectedModel={setSelectedModel} 
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              candleColorStyle={candleColorStyle}
              setCandleColorStyle={setCandleColorStyle}
              language={language}
              setLanguage={setLanguage}
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
              onBack={handleBack} 
              candleColorStyle={candleColorStyle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
