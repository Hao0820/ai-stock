import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { WelcomeStep } from '../components/onboarding/WelcomeStep';
import { AISettingStep } from '../components/onboarding/AISettingStep';

export function OnboardingScreen({
  onStart,
  onSettingsClick,
  selectedModel,
  setSelectedModel,
  apiKeys,
  setApiKeys,
  onSuccess,
  setAvailableModels
}: {
  onStart: () => void,
  onSettingsClick: () => void,
  selectedModel: string,
  setSelectedModel: (m: string) => void,
  apiKeys: { google: string; openai: string; claude: string; deepseek: string },
  setApiKeys: React.Dispatch<
    React.SetStateAction<{ google: string; openai: string; claude: string; deepseek: string }>
  >,
  onSuccess: (msg: string, type?: 'success' | 'error' | 'info') => void,
  setAvailableModels: React.Dispatch<React.SetStateAction<Record<string, { id: string, name: string }[]>>>
}) {
  const { t } = useTranslation();
  const [stage, setStage] = React.useState<'welcome' | 'config'>('welcome');

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-surface">
      {/* Fixed Settings Button */}
      <button
        onClick={onSettingsClick}
        className="absolute top-6 right-6 z-50 p-3 rounded-2xl bg-surface-container/50 backdrop-blur-md border border-outline-variant/20 hover:bg-surface-container hover:scale-105 active:scale-95 transition-all shadow-xl text-on-surface-variant hover:text-primary group"
      >
        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* Background Glow Effects (Shared across steps for consistency) */}
      <div className="fixed inset-0 bg-glow-radial pointer-events-none"></div>
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {stage === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-grow flex flex-col items-stretch justify-center w-full"
          >
            <WelcomeStep 
              onNext={() => setStage('config')} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-grow flex flex-col items-stretch justify-center w-full"
          >
            <AISettingStep 
              onBack={() => setStage('welcome')}
              onStart={onStart}
              onSuccess={onSuccess}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              setAvailableModels={setAvailableModels}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="p-8 text-center relative z-10 opacity-30 mt-auto">
        <p className="text-[10px] font-bold tracking-[0.5em] uppercase text-on-surface">
          {t('common.copyright')}
        </p>
      </footer>
    </div>
  );
}
