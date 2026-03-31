import { GoogleGenAI } from '@google/genai';
import { AIProvider } from './base';

export const geminiProvider: AIProvider = {
  async generateContent(prompt, apiKey, model) {
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
  },

  async validateKey(apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Hi'
      });
      return true;
    } catch (error) {
      console.error('[Gemini] Key validation failed:', error);
      return false;
    }
  },

  async listModels(apiKey) {
    const models: { id: string, name: string }[] = [];
    try {
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
    } catch (e) {
      console.error('[Gemini] Error fetching models:', e);
    }
    return models;
  }
};
