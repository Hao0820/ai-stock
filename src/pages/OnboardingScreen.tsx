import React from 'react';
import { motion } from 'motion/react';
import { Activity, ChevronDown, Key, ShieldCheck, Zap, Lock, Sparkles, Globe } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export function OnboardingScreen({ 
  onStart, 
  selectedModel, 
  setSelectedModel, 
  apiKeys, 
  setApiKeys 
}: { 
  onStart: () => void, 
  selectedModel: string, 
  setSelectedModel: (m: string) => void,
  apiKeys: { google: string, openai: string, claude: string },
  setApiKeys: React.Dispatch<React.SetStateAction<{ google: string, openai: string, claude: string }>>
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 bg-glow-radial pointer-events-none"></div>
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <main className="flex-grow flex items-center justify-center px-6 py-24 relative z-10">
        <div className="max-w-lg w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-12"
          >
            <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-surface-container-high mb-8 shadow-2xl border border-outline-variant/30">
              <Activity className="text-primary w-10 h-10" />
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
              AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">{t('onboarding.title')}</span>
            </h1>
            <p className="text-on-surface-variant text-lg font-light max-w-md mx-auto">
              {t('onboarding.description')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full relative"
          >
            {/* Glowing Border effect */}
            <div className="absolute inset-[-1px] bg-gradient-to-br from-primary/30 via-primary-container/10 to-secondary/20 rounded-[1.5rem] blur-[4px] -z-10"></div>
            
            <div className="glass-panel rounded-3xl p-8 md:p-10 border border-outline-variant/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); onStart(); }}>
                <div className="text-left">
                  <label className="block text-xs font-semibold text-primary/70 mb-3 px-1 uppercase tracking-widest">
                    Select AI Model
                  </label>
                  <div className="relative group">
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-surface-container-high/50 text-on-surface py-4 px-5 rounded-xl border border-outline-variant/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 appearance-none cursor-pointer transition-all duration-300 outline-none"
                    >
                      <option value="google">{t('settings.model.google.name')}</option>
                      <option value="openai">{t('settings.model.openai.name')}</option>
                      <option value="claude">{t('settings.model.claude.name')}</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-xs font-semibold text-primary/70 mb-3 px-1 uppercase tracking-widest">
                    {t('onboarding.key.label')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      <Key className="w-5 h-5" />
                    </span>
                    <input
                      type="password"
                      placeholder={t(`onboarding.key.placeholder.${selectedModel}` as any)}
                      value={apiKeys[selectedModel as keyof typeof apiKeys] || ''}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedModel]: e.target.value }))}
                      className="w-full bg-surface-container-high/50 text-on-surface py-4 pl-12 pr-5 rounded-xl border border-outline-variant/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 placeholder:text-on-surface-variant/40 outline-none"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 px-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary/60" />
                    <p className="text-[11px] text-on-surface-variant tracking-wide font-medium">{t('settings.privacy.desc')}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden relative px-6"
                >
                  <span className="relative z-10 text-sm uppercase tracking-[0.2em]">{t('onboarding.button.start')}</span>
                  <Zap className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
          >
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-surface-container-high/30 transition-colors">
              <Lock className="w-6 h-6 text-secondary fill-secondary/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">Secure TLS 1.3</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-surface-container-high/30 transition-colors">
              <Sparkles className="w-6 h-6 text-primary fill-primary/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">Real-time Analysis</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-surface-container-high/30 transition-colors">
              <Globe className="w-6 h-6 text-on-surface-variant fill-on-surface-variant/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">Global Data</span>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="p-8 text-center border-t border-outline-variant/10 relative z-10">
        <p className="text-on-surface-variant/40 text-[10px] font-bold tracking-[0.3em] uppercase">
          © 2026 AI STOCK. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
