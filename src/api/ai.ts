import { AIAnalysis } from '../types';
import { GoogleGenAI } from '@google/genai';

/**
 * Call AI models (Google/OpenAI/Groq compatible)
 */
async function callAi(prompt: string, apiKey: string, model: string): Promise<string> {
  const isGoogle = model.includes('gemini');
  
  if (isGoogle) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ 
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
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

  const prompt = `You are a Master Stock Strategist. Perform a deep, multi-dimensional analysis for ${name} (${symbol}) @ $${price} (${changePercent}%).

TECHNICAL CONTEXT:
${JSON.stringify(indicators)}

TASK:
Analyze Fundamental Health, News/Sentiment, and Global Trends simultaneously.

RESPONSE FORMAT (JSON ONLY):
{
  "fundamentalSummary": "100-150 words professional report",
  "newsSummary": "200-300 words bullet points or detailed report",
  "trendSummary": "200-300 words macro outlook",
  "recommendation": "Strong Buy|Buy|Hold|Sell|Strong Sell",
  "confidence": 0-100,
  "targetPrice": "Estimate",
  "entryPrice": "Range",
  "exitPrice": "Target/Stop",
  "winRate": 0-100,
  "sentiment": { "positive": 0-1, "neutral": 0-1, "negative": 0-1 },
  "shortTerm": "Specific tactic (3-5 sentences)",
  "mediumTerm": "Specific tactic (3-5 sentences)",
  "longTerm": "Specific tactic (3-5 sentences)",
  "summary": "15-word master mantra"
}

Language: ${isZh ? 'Traditional Chinese' : 'English'}.
Important: Provide high quality, data-driven reasoning for each summary field. No markdown symbols.`;

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
      // We iterate through IT to get all models
      for await (const m of response) {
        const id = m.name.replace('models/', '');
        // Only include models that have 'gemini' in their name
        if (id.toLowerCase().includes('gemini')) {
          let name = id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
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
