import { AIAnalysis } from '../types';
import { GoogleGenAI } from '@google/genai';

/**
 * Call AI models (Google/OpenAI/Groq compatible)
 */
async function callAi(prompt: string, apiKey: string, model: string): Promise<string> {
  const isGoogle = model.includes('gemini');

  if (isGoogle) {
    const ai = new GoogleGenAI({ apiKey });
    const isG2 = model.includes('gemini-2.0') || model.includes('gemini-experimental') || model.includes('gemini-3');

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
        // Enable live Google Search for 2.0+ models
        tools: isG2 ? [{ googleSearch: {} } as any] : undefined
      }
    });

    return response.text || '';
  } else {
    // OpenAI or other standard API
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'AI Request failed');
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

/**
 * Extracts JSON from potential markdown code blocks
 */
function extractJson(text: string): string {
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
 * Single-pass master analysis
 */
export async function analyzeStock(
  symbol: string,
  name: string,
  price: number,
  changePercent: number,
  indicators: any,
  apiKey: string,
  modelId: string = 'gemini-2.0-flash',
  language: string = 'zh-TW'
): Promise<AIAnalysis> {
  const isZh = language === 'zh-TW';

  const marketContext = isZh ? '台灣市場 (Taiwan Market)' : 'Global Market';
  const tickerSuffix = symbol.split('.').pop()?.toUpperCase();
  const isTW = tickerSuffix === 'TW' || tickerSuffix === 'TWO';
  const langName = isZh ? 'Traditional Chinese (繁體中文)' : 'English';
  const priceUnit = isTW ? 'TWD' : 'USD';

  // Dynamic Search Queries based on Market and Language
  const searchQuery1 = isTW ? `"${name} ${symbol} 最新新聞"` : `"${name} ${symbol} latest news"`;
  const searchQuery2 = isTW ? `"${name} 財報 營收 獲利 股利"` : `"${name} earnings revenue dividend report"`;
  const searchQuery3 = isTW ? `"${name} 母公司 子公司 集團 相關公司"` : `"${name} subsidiaries parent company group"`;

  const prompt = `### IDENTITY VERIFICATION (CRITICAL)
Target Company: ${name} (${symbol})
Market: ${marketContext}
${isTW ? 'Note: This is a Taiwan-listed security. Ensure all news and fundamentals refer specifically to this ticker.' : ''}

### LANGUAGE SPECIFICATION
- ALL output MUST be in **${langName}**.
- ${isZh ? 'Use financial terminology standard to the Taiwan/Hong Kong markets.' : 'Use professional international financial terminology.'}
- ${isZh ? 'DO NOT use Simplified Chinese or mainland China specific terminology.' : ''}
- **STRICT ENFORCEMENT**: USE THE NAME '${name}' CONSISTENTLY in the report.

### MASTER INSTRUCTION
You are a High-Precision, Senior Stock Analyst. Your mission is to perform an EXHAUSTIVE, multi-dimensional analysis for **${name} (${symbol})** currently trading at ${priceUnit} $${price} (${changePercent}%).

### ANTI-CONFUSION PROTOCOL
- DO NOT discuss any other companies. 
- ALL generated text in the JSON fields MUST be specifically about ${name} (${symbol}) and written in **${langName}**.

### DATA OVERRIDE & TEMPORAL CONSISTENCY (MANDATORY)
- **CURRENT DATE**: Today is **${new Date().toISOString().split('T')[0]}**.
- **GROUND TRUTH**: The current price of **$${price}** is the absolute, real-time market reality.
- **TEMPORAL FILTER**: If Google Search results are older than 72 hours and mention price levels that conflict with the current price of **$${price}**, you MUST classify those results as **"Outdated News"**. 
- **NO HALLUCINATION**: Do NOT base your entry/exit targets on historical prices from old news. All tactical levels MUST be based on the real-time price of **$${price}**.
- **EXPLICIT ACKNOWLEDGMENT**: If you detect a large discrepancy between news mentions and current price, explicitly state: "${isZh ? `偵測到搜尋資訊具備多日滯後性，本報告已根據最新報價 $${price} 重新校準技術位。` : `Detected news lag; price levels have been recalibrated to the real-time price of $${price}.`}"
- **TEMPORAL REALITY PROTOCOL (2026 MANDATE)**:
  1. **Identify Current Year**: Today is 2026. AD 2025 (ROC 114) is now **HISTORICAL**.
  2. **Tense Enforcement**: You are STRICTLY FORBIDDEN from using future tense for 2025. Any news saying "Expected 2025 growth" or "2025 will be stable" must be treated as **STALE/DEAD**.
  3. **Taiwan Calendar Sync**: If this is a Taiwan stock, understand that "114年度財報" refers to the PREVIOUS year (2025). Focus all "Future/Prospects" analysis strictly on **2026 (ROC 115)** and **2027 (ROC 116)**.
  4. **Dynamic Correction**: If search results mention 2025 as a future projection, you MUST ignore that specific bullet point or rephrase it as "Previously projected in 2025 but current focus is 2026...".

- **DATA CONSISTENCY & REASONING (MANDATORY)**:
  1. **Conflict Detection**: Compare $${price} with prices in search results. If the difference is > 3%, the search text is **OBSELETE**.
  2. **Trend Deviation Analysis**: Identify if the price is now higher or lower than news mentions. Proactively search for "${name} 股價變動原因" or "${name} 最新趨勢分析" to understand the gap.
  3. **Discard Old Levels**: You are strictly forbidden from repeating old support/resistance ranges (like "164-178") from search results if they conflict with the current reality of $${price}. Derive new levels from provided indicators only.

### SEARCH GROUNDING PROTOCOL
1. **DYNAMIC QUERY**: If search results feel outdated relative to $${price}, execute a targeted search for specific recent events causing the current price move.
2. **PRIORITIZE RECENCY**: Focus on events from the LAST 2 DAYS.
3. **CONFLICT RESOLUTION**: Real-time OHLCV metrics provided below take precedence over search snippets for all tactical calculations.

### TECHNICAL CONTEXT
${JSON.stringify(indicators)}

### REQUIRED ANALYSIS DOMAINS
1.  **基本面與財報分析 (Fundamental Health & Earnings)**: Deep dive into revenue growth, gross margins, and SPECIFIC RECENT ANNOUNCEMENTS.
2.  **新聞與情緒分析 (News & Sentiment)**: Extract and analyze the LATEST headlines from today's search results. 
3.  **全球趨勢與宏觀環境 (Global Trends & Macro Environment)**: Analyze how global events directly influence ${name}'s specific business model.

### RESPONSE FORMAT (JSON ONLY)
{
  "fundamentalSummary": "150-250 words professional report for ${name} in ${langName}",
  "newsSummary": "250-400 words detailed report for ${symbol} in ${langName}",
  "trendSummary": "250-400 words macro outlook (mentioning war/recession if applicable) for ${name} in ${langName}",
  "recommendation": "Strong Buy|Buy|Hold|Sell|Strong Sell (Translate to ${langName})",
  "confidence": 0-100,
  "targetPrice": "Decimal value",
  "entryPrice": "Range",
  "exitPrice": "Target/Stop",
  "winRate": 0-100,
  "sentiment": { "positive": 0-1, "neutral": 0-1, "negative": 0-1 },
  "shortTerm": "EXTREMELY DETAILED tactic (8-12 sentences) for ${symbol} in ${langName}",
  "mediumTerm": "EXTREMELY DETAILED tactic (8-12 sentences) for ${symbol} in ${langName}",
  "longTerm": "EXTREMELY DETAILED tactic (8-12 sentences) for ${symbol} in ${langName}",
  "summary": "15-word master mantra for ${name} in ${langName}"
}

Language Constraint: STRICTLY ${langName}. No markdown symbols.`;

  console.log(`[AI] Starting single-pass analysis for ${symbol} using ${modelId}...`);

  try {
    const text = await callAi(prompt, apiKey, modelId);
    const jsonStr = extractJson(text);
    const result = JSON.parse(jsonStr);

    return {
      fundamentalSummary: stripMarkdown(result.fundamentalSummary),
      newsSummary: stripMarkdown(result.newsSummary),
      trendSummary: stripMarkdown(result.trendSummary),
      recommendation: result.recommendation,
      confidence: result.confidence,
      targetPrice: result.targetPrice || 'N/A',
      entryPrice: result.entryPrice || 'N/A',
      exitPrice: result.exitPrice || 'N/A',
      winRate: result.winRate || 50,
      sentiment: result.sentiment || { positive: 0.5, neutral: 0.3, negative: 0.2 },
      shortTerm: stripMarkdown(result.shortTerm),
      mediumTerm: stripMarkdown(result.mediumTerm),
      longTerm: stripMarkdown(result.longTerm),
      summary: stripMarkdown(result.summary)
    };
  } catch (err) {
    console.error('AI Analysis failed:', err);
    throw err;
  }
}

/**
 * Validates an API Key by attempting a small list operation or simple call
 */
export async function validateApiKey(apiKey: string, provider: string = 'google'): Promise<boolean> {
  try {
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Hi'
      });
      return true;
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return res.ok;
    }
    return false;
  } catch (error) {
    console.error('API Key validation failed:', error);
    throw new Error('Key validation failed. Please check your network or key.');
  }
}

/**
 * Returns available models for the provider via real API calls
 */
export async function fetchAvailableModels(apiKey: string, provider: string): Promise<{ id: string, name: string }[]> {
  const models: { id: string, name: string }[] = [];

  try {
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.list();

      // In @google/genai v1.x, list() returns a Pager that is an AsyncIterable
      // We iterate through it to get all models
      const excludedKeywords = [
        'embedding', 'audio', 'live', 'robot', 'tts', 'vision',
        'image', 'search'
      ];

      for await (const m of response) {
        const id = m.name.replace('models/', '');
        const lowerId = id.toLowerCase();

        // 1. Only include models with 'gemini' 
        // 2. Exclude specialized non-text or upcoming preview models
        if (
          lowerId.includes('gemini') &&
          !excludedKeywords.some(keyword => lowerId.includes(keyword))
        ) {
          let name = id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

          // Cleanup common abbreviations
          name = name.replace('Exp', 'Experimental')
            .replace('001', 'v1')
            .replace('002', 'v2');

          if (id === 'gemini-2.0-flash') name += ' (Recommended)';

          models.push({ id, name });
        }
      }

      return models.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await res.json();

      const openAiModels = (data.data || [])
        .filter((m: any) => m.id.toLowerCase().includes('gpt-4') || m.id.toLowerCase().startsWith('o1'))
        .map((m: any) => ({
          id: m.id,
          name: m.id.toUpperCase()
        }));

      return openAiModels.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
  }

  // Hard fallbacks to ensure dropdown is NEVER empty
  if (provider === 'google') {
    return [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Default)' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite' },
      { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro' }
    ];
  }

  return [
    { id: 'gpt-4o', name: 'GPT-4O' },
    { id: 'gpt-4o-mini', name: 'GPT-4O MINI' }
  ];
}
