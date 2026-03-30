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
 * Single-pass master analysis with Fundamental and Timeline support
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

### STRATEGIC INTELLIGENCE TASK (MANDATORY)
If the provided "FUNDAMENTAL DATA" is missing P/E, ROE, or Revenue Growth, you **MUST** use the 'googleSearch' tool to find the 3 most recent quarters of financial performance for **${name} (${symbol})**. Do NOT return null if data exists in the public domain. Fill the "metrics" object with your best verified estimates if exact API values are missing.
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
      "entry": "Optimal entry range",
      "target": "Price level",
      "stopLoss": "Price level",
      "winRate": 0-100,
      "riskLevel": "Medium|Low|High"
    },
    "long": {
      "description": "90-day fundamental outlook (4-6 sentences).",
      "highlights": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "entry": "Value-based entry",
      "target": "Intrinsic value",
      "stopLoss": "Long-term exit",
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
    throw new Error('Key validation failed.');
  }
}

/**
 * Returns available models
 */
export async function fetchAvailableModels(apiKey: string, provider: string): Promise<{ id: string, name: string }[]> {
  const models: { id: string, name: string }[] = [];
  try {
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.list();
      const excluded = ['embedding', 'audio', 'live', 'robot', 'tts', 'vision', 'image', 'search'];

      for await (const m of response) {
        const id = m.name.replace('models/', '');
        const lowerId = id.toLowerCase();
        if (lowerId.includes('gemini') && !excluded.some(k => lowerId.includes(k))) {
          const name = id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          models.push({ id, name });
        }
      }
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        const textModels = data.data.filter((m: any) => m.id.includes('gpt-4') || m.id.includes('gpt-3.5'));
        textModels.forEach((m: any) => models.push({ id: m.id, name: m.id.toUpperCase() }));
      }
    }
  } catch (e) {
    console.error('Error fetching models:', e);
  }
  return models;
}
