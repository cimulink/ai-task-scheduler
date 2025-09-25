import { AIConfig, AIProvider } from './types'

export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || 'mock') as AIProvider

  return {
    provider,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterModelName: process.env.OPENROUTER_MODEL_NAME || 'meta-llama/llama-3.1-8b-instruct:free',
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModelName: process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash'
  }
}

export function validateAIConfig(config: AIConfig): void {
  if (config.provider === 'openrouter' && !config.openrouterApiKey) {
    throw new Error('OpenRouter API key is required when using OpenRouter provider')
  }

  if (config.provider === 'gemini' && !config.geminiApiKey) {
    throw new Error('Gemini API key is required when using Gemini provider')
  }
}