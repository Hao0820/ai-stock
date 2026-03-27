import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Sun, Moon, ShieldCheck, Lock, ArrowLeft, BarChart3, Globe, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { ConfirmModal } from '../components/ConfirmModal';

export function SettingsScreen({
  onBack,
  theme,
  setTheme,
  candleColorStyle,
  setCandleColorStyle,
  language,
  setLanguage,
  onSuccess,
  onFullReset
}: {
  onBack: () => void,
  theme: 'light' | 'dark',
  setTheme: (t: 'light' | 'dark') => void,
  candleColorStyle: 'red-up' | 'green-up',
  setCandleColorStyle: (c: 'red-up' | 'green-up') => void,
  language: 'zh-TW' | 'en-US',
  setLanguage: (l: 'zh-TW' | 'en-US') => void,
  onSuccess: (msg: string, type?: 'success' | 'error' | 'info') => void,
  onFullReset: () => void
}) {
  const { t } = useTranslation();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);

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
          <div className="bg-surface-container rounded-3xl p-8 space-y-8 shadow-xl border border-outline-variant/10">
            {/* Appearance Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-headline font-bold uppercase tracking-wider text-sm">{t('settings.theme.title')}</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setTheme('light');
                      onSuccess(t('common.toast.success.updated'), 'success');
                    }}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all ${theme === 'light'
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
                      onSuccess(t('common.toast.success.updated'), 'success');
                    }}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all ${theme === 'dark'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-outline-variant/50'
                      }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="font-bold">{t('settings.theme.dark')}</span>
                  </button>
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
                      onSuccess(t('common.toast.success.updated'), 'success');
                    }}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${candleColorStyle === 'red-up'
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-medium text-xs">
                      <span className="w-3 h-3 rounded-sm bg-red-500 shadow-sm shadow-red-500/20"></span>{t('settings.candle.up')}
                      <span className="w-3 h-3 rounded-sm bg-green-500 ml-1 shadow-sm shadow-green-500/20"></span>{t('settings.candle.down')}
                    </div>
                    <span className={`font-bold text-sm ${candleColorStyle === 'red-up' ? 'text-primary' : 'text-on-surface'}`}>{t('settings.candle.tw')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setCandleColorStyle('green-up');
                      onSuccess(t('common.toast.success.updated'), 'success');
                    }}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${candleColorStyle === 'green-up'
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-medium text-xs">
                      <span className="w-3 h-3 rounded-sm bg-green-500 shadow-sm shadow-green-500/20"></span>{t('settings.candle.up')}
                      <span className="w-3 h-3 rounded-sm bg-red-500 ml-1 shadow-sm shadow-red-500/20"></span>{t('settings.candle.down')}
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
                      onSuccess(t('common.toast.success.updated'), 'success');
                    }}
                    className={`flex-1 flex items-center justify-center p-4 rounded-2xl border-2 transition-all ${language === 'zh-TW'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50 text-on-surface-variant'
                      }`}
                  >
                    <span className="font-bold text-sm">{t('settings.search.lang.zh')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('en-US');
                      onSuccess(t('common.toast.success.updated'), 'success');
                    }}
                    className={`flex-1 flex items-center justify-center p-4 rounded-2xl border-2 transition-all ${language === 'en-US'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50 text-on-surface-variant'
                      }`}
                  >
                    <span className="font-bold text-sm">{t('settings.search.lang.en')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-5 rounded-3xl bg-surface-container-low border border-outline-variant/10 flex items-start gap-4 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-on-surface">{t('settings.privacy.title')}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed opacity-70">{t('settings.privacy.desc')}</p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-error/10">
            <div className="bg-error/5 border border-error/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3 text-error/80">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">{t('settings.danger.reset.confirm')}</span>
              </div>
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full py-5 rounded-2xl bg-error text-on-error font-headline font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-error/20"
              >
                {t('settings.danger.reset.button')}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={onFullReset}
        type="danger"
        title={t('settings.danger.reset.button')}
        message={t('settings.danger.reset.confirm')}
        confirmLabel={t('settings.danger.reset.button')}
        cancelLabel={t('common.cancel')}
      />
    </div>
  );
}
