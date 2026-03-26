import { AIAnalysis } from '../types';

/**
 * AI API for integrating with Google Gemini
 */
export async function analyzeStock(
  symbol: string, 
  name: string, 
  price: number,
  changePercent: number,
  indicators: any,
  apiKey: string,
  model: string = 'gemini-1.5-pro',
  language: 'zh-TW' | 'en-US' = 'zh-TW'
): Promise<AIAnalysis> {
  if (!apiKey) throw new Error('Missing AI API Key');

  // Map human-readable UI names to technical API Model IDs
  let apiModel = model.toLowerCase().replace(/\s+/g, '-');
  if (apiModel.includes('gemini-1.5-pro')) apiModel = 'gemini-1.5-pro';
  if (apiModel.includes('gemini-1.5-flash')) apiModel = 'gemini-1.5-flash';
  if (apiModel.includes('gemini-1.0-pro')) apiModel = 'gemini-1.0-pro';
  
  // Default fallback if unknown
  if (!apiModel.startsWith('gemini-')) apiModel = 'gemini-1.5-pro';

  const prompt = `
    You are a professional stock market analyst assistant. 
    Analyze the following stock data for ${name} (${symbol}):
    
    Current Price: ${price}
    Daily Change: ${changePercent}%
    Technical Indicators:
    - MACD Line: ${indicators.macdLine}
    - MACD Signal: ${indicators.macdSignal}
    - MACD Histogram: ${indicators.macdHist}
    - RSI (14): ${indicators.rsi14}
    - KD (K9): ${indicators.k9}
    - KD (D9): ${indicators.d9}
    - MA (5): ${indicators.ma5}
    - EMA (12): ${indicators.ema12}
    
    Based on these indicators, provide a professional analysis.
    Output MUST be a valid JSON object in the following format (NO other text):
    {
      "recommendation": "Strong Buy | Buy | Hold | Sell | Strong Sell",
      "confidence": number (0-100),
      "targetPrice": "string (estimated target)",
      "sentiment": { "positive": float (0-1), "neutral": float (0-1), "negative": float (0-1) },
      "shortTerm": "string (1-5 days outlook)",
      "mediumTerm": "string (1-4 weeks outlook)",
      "longTerm": "string (3-6 months outlook)",
      "summary": "string (one sentence summary)"
    }
    
    IMPORTANT: Return ONLY the raw JSON object. Do NOT use Markdown formatting (e.g. no \` \` \`json).
    STRICT: Use only single-line JSON strings. Do NOT use actual newlines inside the JSON values.
    CONCISE: Keep descriptions under 50 words to avoid response truncation.
    CRITICAL: Respond ONLY in ${language === 'zh-TW' ? 'Traditional Chinese (zh-TW)' : 'English (en-US)'}.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1500,
          ...(apiModel.includes('1.5') ? { responseMimeType: "application/json" } : {})
        }
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('Empty response from AI');

    console.log('[AI Debug] Raw Response:', text);

    // Parse JSON safely with robust extraction
    try {
      // Find the JSON block if it's wrapped in markers or text
      const cleanText = extractJson(text);
      console.log('[AI Debug] Cleaned JSON:', cleanText);
      return JSON.parse(cleanText) as AIAnalysis;
    } catch (parseError) {
      console.error('[AI Debug] Parse Error:', parseError);
      throw new Error('AI returned invalid data format');
    }
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    throw error;
  }
}

/**
 * Robustly extracts the JSON object from a string, handling Markdown code blocks 
 * and conversational text prefix/suffix.
 */
function extractJson(text: string): string {
  let cleaned = text.trim();
  
  // 1. Check for markdown code blocks (e.g. ```json ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  
  // 2. Extra safety: Identify common truncation (missing closing brace)
  // If it starts with { but doesn't end with }, we might try to find a valid sub-object 
  // but for now let's just clean up whitespace and illegal newlines.
  
  // 3. Fix literal newlines within JSON strings which break JSON.parse
  // Replacing literal newlines with escaped \n or spaces. 
  // Only doing this if it doesn't look like we're replacing structural code.
  cleaned = cleaned.replace(/\n/g, ' ').replace(/\r/g, ' ');

  // 4. Find the first '{' and last '}' to strip remaining noise
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

/**
 * Validates a Gemini API Key by making a simple request to the models list endpoint
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (response.ok) {
      return true;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Invalid API Key');
    }
  } catch (error: any) {
    console.error('API Key Validation Failed:', error);
    throw error;
  }
}

/**
 * Fetches the list of available models from Gemini and filters for those supporting content generation
 */
export async function fetchAvailableModels(apiKey: string): Promise<{ id: string, name: string }[]> {
  if (!apiKey) return [];
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (response.ok) {
      const data = await response.json();
      // Filter for models that support generating content and are not legacy
      return data.models
        .filter((m: any) => 
          m.supportedGenerationMethods.includes('generateContent') && 
          !m.name.includes('vision') && // Filter out vision-only if needed, but usually we want text
          (m.name.includes('gemini') || m.name.includes('palm'))
        )
        .map((m: any) => ({
          id: m.name.replace('models/', ''), // Strip "models/" prefix
          name: m.displayName
        }));
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch models');
    }
  } catch (error: any) {
    console.error('Fetch Models Error:', error);
    throw error;
  }
}
