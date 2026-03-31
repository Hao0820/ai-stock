import { AIProvider } from './base';

export const claudeProvider: AIProvider = {
  async generateContent(prompt, apiKey, model) {
    const res = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20240620',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'Claude Request failed');
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  },

  async validateKey(apiKey) {
    try {
      const res = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        })
      });
      return res.ok;
    } catch (error) {
      console.error('[Claude] Key validation failed:', error);
      return false;
    }
  },

  async listModels(apiKey) {
    const defaultModels = [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
    ];

    try {
      const res = await fetch('/api/anthropic/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data
            .filter((m: any) => {
              const id = m.id.toLowerCase();
              return (id.includes('sonnet') || id.includes('opus') || id.includes('haiku') || id.includes('claude-3')) && 
                     !id.includes('snapshot') && 
                     !id.includes('preview');
            })
            .map((m: any) => {
              // Simpler and safer name mapping
              let name = m.id;
              if (name.includes('3-5-sonnet')) name = 'Claude 3.5 Sonnet';
              else if (name.includes('3-opus')) name = 'Claude 3 Opus';
              else if (name.includes('3-haiku')) name = 'Claude 3 Haiku';
              else {
                name = name.split('-')
                  .filter((p: string) => !/^\d{8}$/.test(p))
                  .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(' ');
              }
              return { id: m.id, name };
            });
        }
      }
    } catch (e) {
      console.warn('[Claude] Model listing failed, using fallback curated list.', e);
    }
    
    return defaultModels;
  }
};
