import React from 'react';
import { ChevronDown, ShieldCheck, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';
import { validateApiKey, fetchAvailableModels } from '../../api/ai';

interface AISettingStepProps {
  onBack: () => void;
  onStart: () => void;
  onSuccess: (msg: string, type?: 'success' | 'error' | 'info') => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  apiKeys: { google: string, openai: string, claude: string, deepseek: string };
  setApiKeys: React.Dispatch<React.SetStateAction<{ google: string, openai: string, claude: string, deepseek: string }>>;
  setAvailableModels: React.Dispatch<React.SetStateAction<Record<string, { id: string, name: string }[]>>>;
}

export function AISettingStep({
  onBack,
  onStart,
  onSuccess,
  selectedModel,
  setSelectedModel,
  apiKeys,
  setApiKeys,
  setAvailableModels
}: AISettingStepProps) {
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = React.useState(false);

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full overflow-hidden">
      <div className="max-w-xl w-full">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group"
        >
          <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">{t('common.back')}</span>
        </button>

        {/* Setting Card */}
        <div className="glass-panel rounded-[2.5rem] p-10 border border-outline-variant/20 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">{t('onboarding.subtitle')}</h2>
          <p className="text-on-surface-variant text-sm mb-10 opacity-70">{t('onboarding.key.subtitle')}</p>

          <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
            {/* Provider Selector */}
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-1">
                {t('onboarding.provider.label')}
              </label>
              <div className="relative group">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-surface-container-high/50 text-on-surface py-5 px-6 rounded-2xl border border-outline-variant/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 appearance-none cursor-pointer transition-all duration-300 outline-none text-base font-medium"
                >
                  <option value="google">{t('settings.model.google.name')}</option>
                  <option value="openai">{t('settings.model.openai.name')}</option>
                  <option value="claude">{t('settings.model.claude.name')}</option>
                  <option value="deepseek">{t('settings.model.deepseek.name')}</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <ChevronDown className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-1">
                {t('onboarding.key.label')}
              </label>
              <div className="relative group">
                <input
                  type="password"
                  placeholder={t(`onboarding.key.placeholder.${selectedModel}` as any)}
                  value={apiKeys[selectedModel as keyof typeof apiKeys] || ''}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedModel]: e.target.value }))}
                  className="w-full bg-surface-container-high/50 text-on-surface py-5 px-6 rounded-2xl border border-outline-variant/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 placeholder:text-on-surface-variant/30 outline-none text-base"
                />
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] text-on-surface-variant font-medium">{t('settings.privacy.desc')}</span>
                <a 
                  href={
                    selectedModel === 'google' ? 'https://aistudio.google.com/app/apikey' :
                    selectedModel === 'openai' ? 'https://platform.openai.com/api-keys' :
                    selectedModel === 'claude' ? 'https://console.anthropic.com/settings/keys' :
                    'https://platform.deepseek.com/api_keys'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 transition-all"
                >
                  {t('onboarding.key.get')}
                </a>
              </div>
            </div>

            {/* Validation Button */}
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
    </div>
  );
}
