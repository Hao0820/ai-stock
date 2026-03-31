import { AIAnalysis } from '../types';
import { geminiProvider } from './providers/gemini';
import { openaiProvider } from './providers/openai';
import { claudeProvider } from './providers/claude';
import { deepseekProvider } from './providers/deepseek';
import { AIProvider } from './providers/base';

/**
 * Returns the appropriate provider implementation
 */
function getProvider(providerName: string): AIProvider {
  switch (providerName.toLowerCase()) {
    case 'google':
    case 'gemini':
      return geminiProvider;
    case 'openai':
      return openaiProvider;
    case 'claude':
    case 'anthropic':
      return claudeProvider;
    case 'deepseek':
      return deepseekProvider;
    default:
      return geminiProvider;
  }
}

/**
 * Call AI models through the provider system
 */
async function callAi(prompt: string, apiKey: string, model: string): Promise<string> {
  // Simple heuristic for provider
  const providerName = model.includes('gemini') ? 'google' : 
                      model.includes('gpt') || model.includes('o1') ? 'openai' : 
                      model.includes('claude') ? 'claude' : 
                      model.includes('deepseek') ? 'deepseek' : 'google';
  
  const provider = getProvider(providerName);
  return provider.generateContent(prompt, apiKey, model);
}

/**
 * Extracts JSON from potential markdown code blocks
 */
export function extractJson(text: string): string {
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/{[\s\S]*}/);
  return jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
}

/**
 * Robustly removes common markdown syntax like # and **
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/#+\s*/g, '')           // Headers
    .replace(/\*\*|__/g, '')         // Bold/Italic symbols
    .replace(/^\s*[\*\-+]\s+/gm, '') // Bullet point markers at start of lines
    .replace(/\s\*\s/g, ' ')         // Floating asterisks
    .trim();
}

/**
 * Master analysis function
 */
export async function analyzeStock(
  symbol: string,
  name: string,
  price: number,
  changePercent: number,
  indicators: any,
  apiKey: string,
  modelId: string = 'gemini-2.0-flash',
  language: string = 'zh-TW',
  fundamentals?: any
): Promise<AIAnalysis> {
  const isZh = language === 'zh-TW';
  const marketContext = isZh ? '台灣市場 (Taiwan Market)' : 'Global Market';
  const tickerSuffix = symbol.split('.').pop()?.toUpperCase();
  const isTW = tickerSuffix === 'TW' || tickerSuffix === 'TWO';
  const langName = isZh ? 'Traditional Chinese (繁體中文)' : 'English';
  const priceUnit = isTW ? 'TWD' : 'USD';

  const prompt = `### IDENTITY VERIFICATION (CRITICAL)
Target Company: ${name} (${symbol})
Market: ${marketContext}
${isTW ? 'Note: This is a Taiwan-listed security. Ensure all news and fundamentals refer specifically to this ticker.' : ''}

### LANGUAGE SPECIFICATION
- ALL output MUST be in **${langName}**.
- ${isZh ? 'Use financial terminology standard to the Taiwan/Hong Kong markets.' : 'Use professional international financial terminology.'}
- **STRICT ENFORCEMENT**: USE THE NAME '${name}' CONSISTENTLY in the report.

### MASTER INSTRUCTION
You are a High-Precision, Senior Stock Analyst & Quantitative Strategist. Your mission is to perform an EXHAUSTIVE, multi-dimensional analysis for **${name} (${symbol})** currently trading at ${priceUnit} $${price} (${changePercent}%). Your report must be data-driven, objective, and structurally flawless.

### FUNDAMENTAL DATA (GROUND TRUTH)
${fundamentals ? JSON.stringify(fundamentals) : 'No direct fundamental data provided; use real-time search results to verify revenue, growth, and valuation ratios.'}

### DATA OVERRIDE & TEMPORAL CONSISTENCY
- **CURRENT DATE**: Today is **${new Date().toISOString().split('T')[0]}**.
- **GROUND TRUTH**: The current price of **$${price}** is the absolute, real-time market reality.

### TECHNICAL CONTEXT
${JSON.stringify(indicators)}

### REQUIRED ANALYSIS DOMAINS
1.  **基本面與財報分析 (Fundamental & Earnings)**: Analyze revenue growth, ROE, P/E ratios. Identify if this is a value play or a growth trap.
2.  **新聞與情緒分析 (News & Sentiment)**: Compare retail sentiment from search results with professional analyst trends.
3.  **全球趨勢與宏觀環境 (Global Macro)**: Anchor the analysis to the specific sector and industry trends.

### strategic intent (MANDATORY)
- Search Query Examples: "${name} ${symbol} P/E ratio 2024", "${name} 2317.TW ROE 財報".

### RESPONSE FORMAT (JSON ONLY)
{
  "recommendation": "Strong Buy|Buy|Hold|Sell|Strong Sell",
  "confidence": 0-100,
  "sentiment": { "positive": 0-1, "neutral": 0-1, "negative": 0-1 },
  "summary": "15-word master mantra",
  "timelines": {
    "short": {
      "description": "7-day tactical outlook focusing on immediate price action and technical levels (4-6 sentences).",
      "highlights": ["Bullet point 1 (Max 15 words)", "Bullet point 2", "Bullet point 3"],
      "entry": "Precise price range (e.g. 90.00-92.00)",
      "target": "Price level",
      "stopLoss": "Price level",
      "winRate": 0-100,
      "riskLevel": "Low|Medium|High"
    },
    "medium": {
      "description": "30-day strategy focusing on trend continuation (4-6 sentences).",
      "highlights": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "entry": "Optimal entry range (e.g. 95.00-97.00)",
      "target": "Target price level (e.g. 110.00)",
      "stopLoss": "Stop loss level (e.g. 88.00)",
      "winRate": 0-100,
      "riskLevel": "Medium|Low|High"
    },
    "long": {
      "description": "90-day fundamental outlook (4-6 sentences).",
      "highlights": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "entry": "Value entry level (e.g. 85.00-88.00)",
      "target": "Intrinsic target value (e.g. 150.00)",
      "stopLoss": "Long-term exit point (e.g. 70.00)",
      "winRate": 0-100,
      "riskLevel": "High|Medium|Low"
    }
  },
  "metrics": {
    "pe": number or null,
    "roe": number or null,
    "revenueGrowth": number or null,
    "analystTarget": number or null,
    "recommendationKey": "buy|hold|sell",
    "shortPercentOfFloat": number or null
  },
  "fundamentalSummary": "150-250 words fundamental deep dive",
  "newsSummary": "250-400 words detailed news/sentiment report",
  "trendSummary": "250-400 words macro outlook"
}

Language Constraint: STRICTLY ${langName}. No markdown symbols.`;

  try {
    const rawResponse = await callAi(prompt, apiKey, modelId);
    const jsonString = extractJson(rawResponse);
    const parsed: any = JSON.parse(jsonString);

    return parsed as AIAnalysis;
  } catch (err) {
    console.error('AI Analysis failed:', err);
    throw err;
  }
}

/**
 * Validates an API Key
 */
export async function validateApiKey(apiKey: string, provider: string): Promise<boolean> {
  try {
    const impl = getProvider(provider);
    return await impl.validateKey(apiKey);
  } catch (error) {
    console.error('[AI] Key validation failed:', error);
    return false;
  }
}

/**
 * Returns available models
 */
export async function fetchAvailableModels(apiKey: string, provider: string): Promise<{ id: string, name: string }[]> {
  try {
    const impl = getProvider(provider);
    return await impl.listModels(apiKey);
  } catch (e) {
    console.error('[AI] Error fetching models:', e);
    return [];
  }
}
