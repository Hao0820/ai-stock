import { AIProvider } from './base';

export const openaiProvider: AIProvider = {
  async generateContent(prompt, apiKey, model) {
    const res = await fetch('/api/openai/v1/chat/completions', {
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
      throw new Error(errorData.error?.message || 'OpenAI Request failed');
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },

  async validateKey(apiKey) {
    try {
      const res = await fetch('/api/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return res.ok;
    } catch (error) {
      console.error('[OpenAI] Key validation failed:', error);
      return false;
    }
  },

  async listModels(apiKey) {
    const models: { id: string, name: string }[] = [];
    try {
      const res = await fetch('/api/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Refined filter for clean, chat-optimized text models
        const textModels = data.data.filter((m: any) => {
          const id = m.id.toLowerCase();
          
          // Must be one of the core supported families
          const isCoreFamily = id.startsWith('gpt-4') || id.startsWith('gpt-3.5') || id.startsWith('o1') || id.startsWith('o3');
          
          // Exclude specialized/deprecated variants
          const isSpecialized = id.includes('audio') || 
                               id.includes('vision') || 
                               id.includes('instruct') || 
                               id.includes('realtime') || 
                               id.includes('preview') || 
                               id.includes('search') ||
                               id.includes('transcribe') ||
                               id.includes('tts') ||
                               id.includes('snapshot') ||
                               /\d{4}-\d{2}-\d{2}/.test(id) || // Exclude date-stamped snapshots like -2024-05-13
                               id.includes('-0') || // Exclude sub-versions like -0613
                               id.includes('-1');
          
          return isCoreFamily && !isSpecialized;
        });

        // Add back the stable aliases explicitly to ensure they are present if filtered out
        const stableAliases = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini'];
        const existingIds = new Set(textModels.map((m: any) => m.id));
        
        textModels.forEach((m: any) => models.push({ 
          id: m.id, 
          name: m.id.toUpperCase() 
        }));

        // Ensure primary stable models are at the top if they exist in the full data
        stableAliases.forEach(alias => {
          if (!existingIds.has(alias) && data.data.some((m: any) => m.id === alias)) {
            models.unshift({ id: alias, name: alias.toUpperCase() });
          }
        });
      }
    } catch (e) {
      console.error('[OpenAI] Error fetching models:', e);
    }
    return models;
  }
};
