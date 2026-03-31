import React from 'react';
import { Activity, Zap, Lock, Sparkles, Globe } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full overflow-hidden">
      <div className="max-w-5xl w-full flex flex-col items-center text-center">
        {/* Branding Icon */}
        <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-surface-container-high mb-12 shadow-2xl border border-outline-variant/30 group hover:scale-110 transition-transform duration-500">
          <Activity className="text-primary w-12 h-12" />
        </div>

        {/* Hero Title */}
        <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter text-on-surface mb-6 leading-none">
          AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-container to-secondary">
            {t('onboarding.title')}
          </span>
        </h1>

        {/* Hero Description */}
        <p className="text-on-surface-variant text-xl md:text-2xl font-light max-w-md mx-auto mb-16 leading-relaxed opacity-80">
          {t('onboarding.description')}
        </p>

        {/* Start Button */}
        <button
          onClick={onNext}
          className="group relative px-12 py-5 rounded-2xl bg-primary text-on-primary font-headline font-bold text-lg shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center gap-3">
            {t('onboarding.button.start')}
            <Zap className="w-6 h-6 animate-pulse" />
          </span>
        </button>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-3 gap-8 opacity-40">
          <div className="flex flex-col items-center gap-2">
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
    </div>
  );
}
