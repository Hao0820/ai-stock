import { AIProvider } from './base';

export const deepseekProvider: AIProvider = {
  async generateContent(prompt, apiKey, model) {
    const res = await fetch('/api/deepseek/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'DeepSeek Request failed');
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },

  async validateKey(apiKey) {
    try {
      const res = await fetch('/api/deepseek/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return res.ok;
    } catch (error) {
      console.error('[DeepSeek] Key validation failed:', error);
      return false;
    }
  },

  async listModels(apiKey) {
    const defaultModels = [
      { id: 'deepseek-chat', name: 'DeepSeek-V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoner)' }
    ];

    try {
      const res = await fetch('/api/deepseek/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data
            .filter((m: any) => m.id.includes('deepseek'))
            .map((m: any) => ({
              id: m.id,
              name: m.id.includes('chat') ? 'DeepSeek-V3' : 
                    m.id.includes('reasoner') ? 'DeepSeek-R1 (Reasoner)' : 
                    m.id.toUpperCase()
            }));
        }
      }
    } catch (e) {
      console.warn('[DeepSeek] Model listing failed, using default list.', e);
    }
    return defaultModels;
  }
};
