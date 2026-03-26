import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Sparkles, Sun, Moon, ShieldCheck, Lock, ArrowLeft, BarChart3, Globe, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { validateApiKey, fetchAvailableModels } from '../api/ai';

export function SettingsScreen({ 
  onBack,
  theme, 
  setTheme, 
  selectedModel, 
  setSelectedModel,
  apiKeys,
  setApiKeys,
  candleColorStyle,
  setCandleColorStyle,
  language,
  setLanguage,
  onSuccess,
  setAvailableModels,
  onFullReset
}: { 
  onBack: () => void,
  theme: 'light' | 'dark', 
  setTheme: (t: 'light' | 'dark') => void,
  selectedModel: string,
  setSelectedModel: (m: string) => void,
  apiKeys: { google: string, openai: string, claude: string },
  setApiKeys: React.Dispatch<React.SetStateAction<{ google: string, openai: string, claude: string }>>,
  candleColorStyle: 'red-up' | 'green-up',
  setCandleColorStyle: (c: 'red-up' | 'green-up') => void,
  language: 'zh-TW' | 'en-US',
  setLanguage: (l: 'zh-TW' | 'en-US') => void,
  onSuccess: (msg: string) => void,
  setAvailableModels: React.Dispatch<React.SetStateAction<Record<string, { id: string, name: string }[]>>>,
  onFullReset: () => void
}) {
  const { t } = useTranslation();
  const [verifyingModel, setVerifyingModel] = React.useState<string | null>(null);
  const [validationStatuses, setValidationStatuses] = React.useState<Record<string, 'valid' | 'invalid' | null>>({});

  const handleVerify = async (modelId: string) => {
    const key = apiKeys[modelId as keyof typeof apiKeys];
    if (!key) return;

    setVerifyingModel(modelId);
    try {
      await validateApiKey(key);
      
      // Fetch models and update state
      const models = await fetchAvailableModels(key);
      setAvailableModels(prev => ({ ...prev, [modelId]: models }));
      
      setValidationStatuses(prev => ({ ...prev, [modelId]: 'valid' }));
      onSuccess(t('common.toast.success.paired'));
    } catch (err: any) {
      setValidationStatuses(prev => ({ ...prev, [modelId]: 'invalid' }));
      onSuccess(t('common.toast.error.invalidKey', err.message));
    } finally {
      setVerifyingModel(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface-container-low flex items-center w-full px-6 h-16 fixed top-0 z-50">
        <button 
          onClick={onBack}
          className="hover:bg-on-surface/5 transition-colors p-2 rounded-full active:scale-95 duration-200"
        >
          <ArrowLeft className="text-on-surface w-6 h-6" />
        </button>
        <h1 className="font-headline font-bold tracking-tight text-xl text-on-surface ml-4">{t('settings.title')}</h1>
      </header>

      <main className="flex-grow flex flex-col items-center px-6 max-w-lg mx-auto w-full pt-36 pb-24">
        <div className="w-full space-y-8">
          <div className="bg-surface-container rounded-2xl p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Cpu className="w-5 h-5" />
                <h3 className="font-headline font-bold uppercase tracking-wider text-sm">{t('settings.model.title')}</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                { [
                  { id: 'google', name: t('settings.model.google.name'), desc: t('settings.model.google.desc') },
                  { id: 'openai', name: t('settings.model.openai.name'), desc: t('settings.model.openai.desc') },
                  { id: 'claude', name: t('settings.model.claude.name'), desc: t('settings.model.claude.desc') }
                ].map((model) => (
                  <div key={model.id} className="space-y-2">
                    <button
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                        selectedModel === model.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50'
                      }`}
                    >
                      <span className={`font-bold ${selectedModel === model.id ? 'text-primary' : 'text-on-surface'}`}>{model.name}</span>
                      <span className="text-xs text-on-surface-variant mt-1">{model.desc}</span>
                    </button>
                    {selectedModel === model.id && (
                      <div className="px-1 py-1 space-y-2">
                        <div className="relative group/input">
                          <input
                            type="password"
                            placeholder={t(`onboarding.key.placeholder.${model.id}` as any)}
                            value={apiKeys[model.id as keyof typeof apiKeys] || ''}
                            onChange={(e) => {
                              setApiKeys(prev => ({ ...prev, [model.id]: e.target.value }));
                              setValidationStatuses(prev => ({ ...prev, [model.id]: null }));
                            }}
                            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg py-2.5 pl-3 pr-10 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-on-surface-variant/30"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {validationStatuses[model.id] === 'valid' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                            {validationStatuses[model.id] === 'invalid' && <XCircle className="w-4 h-4 text-error" />}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerify(model.id)}
                            disabled={!apiKeys[model.id as keyof typeof apiKeys] || verifyingModel === model.id}
                            className="w-full text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {verifyingModel === model.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('onboarding.status.validating')}
                              </>
                            ) : (
                              t('onboarding.button.start')
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-outline-variant/10 w-full"></div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <BarChart3 className="w-5 h-5" />
                <h3 className="font-headline font-bold uppercase tracking-wider text-sm">{t('settings.candle.title')}</h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCandleColorStyle('red-up');
                    onSuccess(t('common.toast.success.updated'));
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    candleColorStyle === 'red-up' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-sm bg-red-500"></span>{t('settings.candle.up')}
                    <span className="w-3 h-3 rounded-sm bg-green-500 ml-1"></span>{t('settings.candle.down')}
                  </div>
                  <span className={`font-bold text-sm ${candleColorStyle === 'red-up' ? 'text-primary' : 'text-on-surface'}`}>{t('settings.candle.tw')}</span>
                </button>
                <button
                  onClick={() => {
                    setCandleColorStyle('green-up');
                    onSuccess(t('common.toast.success.updated'));
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    candleColorStyle === 'green-up' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-sm bg-green-500"></span>{t('settings.candle.up')}
                    <span className="w-3 h-3 rounded-sm bg-red-500 ml-1"></span>{t('settings.candle.down')}
                  </div>
                  <span className={`font-bold text-sm ${candleColorStyle === 'green-up' ? 'text-primary' : 'text-on-surface'}`}>{t('settings.candle.global')}</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-outline-variant/10 w-full"></div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Globe className="w-5 h-5" />
                <h3 className="font-headline font-bold uppercase tracking-wider text-sm">{t('settings.search.lang.title')}</h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setLanguage('zh-TW');
                    onSuccess(t('common.toast.success.updated'));
                  }}
                  className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    language === 'zh-TW' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50 text-on-surface-variant'
                  }`}
                >
                  <span className="font-bold text-sm">{t('settings.search.lang.zh')}</span>
                </button>
                <button
                  onClick={() => {
                    setLanguage('en-US');
                    onSuccess(t('common.toast.success.updated'));
                  }}
                  className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    language === 'en-US' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50 text-on-surface-variant'
                  }`}
                >
                  <span className="font-bold text-sm">{t('settings.search.lang.en')}</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-outline-variant/10 w-full"></div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-headline font-bold uppercase tracking-wider text-sm">{t('settings.theme.title')}</h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTheme('light');
                    onSuccess(t('common.toast.success.updated'));
                  }}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all ${
                    theme === 'light' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-outline-variant/50'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="font-bold">{t('settings.theme.light')}</span>
                </button>
                <button
                  onClick={() => {
                    setTheme('dark');
                    onSuccess(t('common.toast.success.updated'));
                  }}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-outline-variant/50'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="font-bold">{t('settings.theme.dark')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-primary mt-1 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-on-surface">{t('settings.privacy.title')}</p>
              <p className="text-xs text-on-surface-variant">{t('settings.privacy.desc')}</p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-error/20 space-y-6">
            <div className="flex items-center gap-3 text-error">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-wider text-sm">{t('settings.danger.title')}</h3>
            </div>
            
            <div className="bg-error/5 border border-error/10 rounded-2xl p-6 space-y-4">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t('settings.danger.reset.confirm')}
              </p>
              <button
                onClick={() => {
                  if (window.confirm(t('settings.danger.reset.confirm'))) {
                    onFullReset();
                  }
                }}
                className="w-full py-4 rounded-xl bg-error text-on-error font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-error/20"
              >
                {t('settings.danger.reset.button')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
