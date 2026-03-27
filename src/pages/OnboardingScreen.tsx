import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, Key, ShieldCheck, Zap, Lock, Sparkles, Globe, Settings, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { validateApiKey, fetchAvailableModels } from '../api/ai';

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
  apiKeys: { google: string, openai: string, claude: string },
  setApiKeys: React.Dispatch<React.SetStateAction<{ google: string, openai: string, claude: string }>>,
  onSuccess: (msg: string, type?: 'success' | 'error' | 'info') => void,
  setAvailableModels: React.Dispatch<React.SetStateAction<Record<string, { id: string, name: string }[]>>>
}) {
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = React.useState(false);
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

      {/* Background Glow Effects */}
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
            className="flex-grow flex flex-col items-center justify-center px-6 relative z-10"
          >
            <div className="max-w-lg w-full flex flex-col items-center text-center">
              <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-surface-container-high mb-12 shadow-2xl border border-outline-variant/30 group hover:scale-110 transition-transform duration-500">
                <Activity className="text-primary w-12 h-12" />
              </div>
              <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter text-on-surface mb-6 leading-none">
                AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-container to-secondary">{t('onboarding.title')}</span>
              </h1>
              <p className="text-on-surface-variant text-xl md:text-2xl font-light max-w-md mx-auto mb-16 leading-relaxed opacity-80">
                {t('onboarding.description')}
              </p>

              <button
                onClick={() => setStage('config')}
                className="group relative px-12 py-5 rounded-2xl bg-primary text-on-primary font-headline font-bold text-lg shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center gap-3">
                  {t('onboarding.button.start')}
                  <Zap className="w-6 h-6 animate-pulse" />
                </span>
              </button>

              <div className="mt-20 grid grid-cols-3 gap-8 opacity-40">
                <div className="flex flex-col items-center gap-2">
                  <Lock className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('onboarding.feature.secure')}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('onboarding.feature.realtime')}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('onboarding.feature.global')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-grow flex flex-col items-center justify-center px-6 relative z-10"
          >
            <div className="max-w-lg w-full">
              <button
                onClick={() => setStage('welcome')}
                className="mb-8 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group"
              >
                <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">{t('common.back')}</span>
              </button>

              <div className="glass-panel rounded-[2.5rem] p-10 border border-outline-variant/20 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative">
                <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/30 shadow-xl rotate-12">
                  <Key className="text-primary w-6 h-6" />
                </div>

                <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">{t('onboarding.subtitle')}</h2>
                <p className="text-on-surface-variant text-sm mb-10 opacity-70">{t('onboarding.key.subtitle')}</p>

                <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-1">
                      {t('onboarding.provider.label')}
                    </label>
                    <div className="relative group">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-surface-container-high/50 text-on-surface py-5 px-6 rounded-2xl border border-outline-variant/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 appearance-none cursor-pointer transition-all duration-300 outline-none text-lg font-medium"
                      >
                        <option value="google">{t('settings.model.google.name')}</option>
                        <option value="openai">{t('settings.model.openai.name')}</option>
                        <option value="claude">{t('settings.model.claude.name')}</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
                        <ChevronDown className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-1">
                      {t('onboarding.key.label')}
                    </label>
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                        <Key className="w-5 h-5" />
                      </span>
                      <input
                        type="password"
                        placeholder={t(`onboarding.key.placeholder.${selectedModel}` as any)}
                        value={apiKeys[selectedModel as keyof typeof apiKeys] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedModel]: e.target.value }))}
                        className="w-full bg-surface-container-high/50 text-on-surface py-5 pl-14 pr-6 rounded-2xl border border-outline-variant/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 placeholder:text-on-surface-variant/30 outline-none text-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 px-2">
                      <ShieldCheck className="w-4 h-4 text-secondary" />
                      <span className="text-[11px] text-on-surface-variant font-medium">{t('settings.privacy.desc')}</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      const key = apiKeys[selectedModel as keyof typeof apiKeys];
                      if (!key) {
                        onSuccess(t('common.toast.error.genericKey'), 'error');
                        return;
                      }

                      setIsValidating(true);
                      try {
                        await validateApiKey(key, selectedModel);
                        const models = await fetchAvailableModels(key, selectedModel);
                        setAvailableModels(prev => ({ ...prev, [selectedModel]: models }));
                        onStart();
                        onSuccess(t('common.toast.success.paired'), 'success');
                      } catch (err: any) {
                        onSuccess(t('common.toast.error.invalidKey', err.message), 'error');
                      } finally {
                        setIsValidating(false);
                      }
                    }}
                    disabled={!apiKeys[selectedModel as keyof typeof apiKeys] || isValidating}
                    className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none group"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="uppercase tracking-[0.2em] text-sm">{t('onboarding.status.validating')}</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase tracking-[0.2em] text-sm">{t('onboarding.button.pairing')}</span>
                        <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
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
