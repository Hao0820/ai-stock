import { Translations } from './zh-TW';

export const enUS: Translations = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.back': 'Back',

  // Onboarding
  'onboarding.title': 'The Future is Now',
  'onboarding.subtitle': 'Next-Gen Professional AI',
  'onboarding.description': 'Powered by our proprietary Neural Engine, conducting deep multi-dimensional analysis across global markets in real-time.',
  'onboarding.button.start': 'Finish Setup',
  'onboarding.key.label': 'API Key Configuration',
  'onboarding.key.placeholder.google': 'Enter your Gemini API key',
  'onboarding.key.placeholder.openai': 'Enter your OpenAI API key (sk-...)',
  'onboarding.key.placeholder.claude': 'Enter your Claude API key (sk-ant-...)',
  'onboarding.beta.message': 'BETA PREVIEW - INVITATION ONLY',

  // Nav
  'nav.title': 'AI Stock',
  'nav.tab.analysis': 'Analysis',
  'nav.tab.history': 'History',

  // Analysis Tab
  'analysis.layer': 'AI Model',
  'analysis.identifier': 'Stock Identifier',
  'analysis.input.placeholder': 'Ticker or Name (e.g., AAPL or MSFT)',
  'analysis.error.empty': 'Please enter a stock symbol or name',
  'analysis.error.notFound': 'Could not find any symbol matching "{0}". Please check your query.',
  'analysis.button.searching': 'Searching Market...',
  'analysis.button.start': 'Start AI Analysis',

  // History Tab
  'history.title': 'Recent Analysis',
  'history.empty.title': 'No Traces Found',
  'history.empty.desc': 'Your trading forecasts and analysis are securely encrypted here. You have not analyzed any symbols yet. Head over to the Analysis tab to run your first projection.',

  // Settings
  'settings.title': 'System Settings',
  'settings.model.title': 'AI Provider Selection',
  'settings.model.google.name': 'Google Gemini',
  'settings.model.google.desc': 'Powerful Multi-modal Model',
  'settings.model.openai.name': 'OpenAI ChatGPT',
  'settings.model.openai.desc': 'Industry Leading Reasoning',
  'settings.model.claude.name': 'Anthropic Claude',
  'settings.model.claude.desc': 'Superior Structured Analysis',
  'settings.search.lang.title': 'Search & Interface Region',
  'settings.search.lang.zh': 'Chinese',
  'settings.search.lang.en': 'English',
  'settings.candle.title': 'Candlestick Color Config',
  'settings.candle.tw': 'Taiwan Standard',
  'settings.candle.global': 'Global Standard (US)',
  'settings.candle.up': 'Up',
  'settings.candle.down': 'Down',
  'settings.theme.title': 'Interface Theme',
  'settings.theme.light': 'Light Mode',
  'settings.theme.dark': 'Dark Mode',
  'settings.privacy.title': 'Privacy On',
  'settings.privacy.desc': 'All analytics processed locally',

  // Detail Screen
  'detail.marketData': 'MARKET DATA',
  'detail.indicators': 'Indicators',
  'detail.res.day': '1D',
  'detail.res.week': '1W',
  'detail.res.month': '1M',
  'detail.indicator.ma5': '5MA',
  'detail.indicator.ema12': '12EMA',
  'detail.indicator.bb': 'BB(21)',
  'detail.indicator.rsi': 'RSI(14)',
  'detail.indicator.kd': 'KD(9,3,3)',
  'detail.indicator.macd': 'MACD(12,26,9)',
  'detail.tooltip.vol': 'Vol',

  // AI Advice
  'ai.advice.title': 'AI Recommendation',
  'ai.advice.buy': 'STRONG BUY',
  'ai.advice.confidence': 'Confidence',
  'ai.advice.targetPrice': 'Target Price',

  // News Sentiment
  'news.sentiment.title': 'News Sentiment',
  'news.sentiment.bullish': 'Bullish',
  'news.sentiment.positive': 'Positive',
  'news.sentiment.neutral': 'Neutral',
  'news.sentiment.negative': 'Negative',
  'news.sentiment.quote': '"AI detected a significant surge in positive coverage recently."',

  // AI Multi-dimensional
  'ai.multi.title': 'AI Strategic Multi-view',
  'ai.multi.subtitle': 'Neural Engine v4.2 Analysis (Demo Data)',
  'ai.multi.tab.short': 'Short-term',
  'ai.multi.tab.medium': 'Mid-term',
  'ai.multi.tab.long': 'Long-term',

  'ai.multi.short.title': 'Breakout Signal Confirmed',
  'ai.multi.short.desc': 'A strong support has formed in the near term. With the 5MA violently crossing the 20MA, technicals show a definitive bullish convergence.',
  'ai.multi.medium.title': 'Fundamental Optimization',
  'ai.multi.medium.desc': 'Mid-term (1-3 quarters) core momentum is driven by stable revenue growth and yield enhancement. Gross margins are projected to climb linearly.',
  'ai.multi.long.title': 'Global Leadership Secure',
  'ai.multi.long.desc': 'The long-term strategic focus remains cementing the technological moat against global peers.',

  // Disclaimer
  'disclaimer.title': 'Investment Advisory Disclaimer',
  'disclaimer.desc': 'Some analytics rendered in this report are static previews for demonstration. Top price quotes and sub-charts reflect real market data. This interface is for reference only and does not constitute financial advice, solicitation, or invitation to trade.'
};
