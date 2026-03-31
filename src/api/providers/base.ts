/**
 * Interface representing a standard AI Provider implementation
 */
export interface AIProvider {
  /**
   * Generates content from a prompt
   */
  generateContent(prompt: string, apiKey: string, model: string): Promise<string>;

  /**
   * Validates if an API Key is working
   */
  validateKey(apiKey: string): Promise<boolean>;

  /**
   * Lists available models for this provider
   */
  listModels(apiKey: string): Promise<{ id: string; name: string }[]>;
}
