import React from 'react';
import { Cpu, Sparkles, Sun, Moon, ShieldCheck, Lock, ArrowLeft, BarChart3, Globe } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

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
  setLanguage
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
  setLanguage: (l: 'zh-TW' | 'en-US') => void
}) {
  const { t } = useTranslation();
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
                      <div className="px-1 py-1">
                        <input
                          type="password"
                          placeholder={t(`onboarding.key.placeholder.${model.id}` as any)}
                          value={apiKeys[model.id as keyof typeof apiKeys] || ''}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [model.id]: e.target.value }))}
                          className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg py-2.5 px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-on-surface-variant/30"
                        />
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
                  onClick={() => setCandleColorStyle('red-up')}
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
                  onClick={() => setCandleColorStyle('green-up')}
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
                  onClick={() => setLanguage('zh-TW')}
                  className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    language === 'zh-TW' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50 text-on-surface-variant'
                  }`}
                >
                  <span className="font-bold text-sm">{t('settings.search.lang.zh')}</span>
                </button>
                <button
                  onClick={() => setLanguage('en-US')}
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
                  onClick={() => setTheme('light')}
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
                  onClick={() => setTheme('dark')}
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

          <div className="bg-surface-container-low rounded-2xl p-5 flex items-center justify-between border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-sm font-bold text-on-surface">{t('settings.privacy.title')}</p>
                <p className="text-xs text-on-surface-variant">{t('settings.privacy.desc')}</p>
              </div>
            </div>
            <Lock className="w-4 h-4 text-on-surface-variant/30" />
          </div>
        </div>
      </main>
    </div>
  );
}
