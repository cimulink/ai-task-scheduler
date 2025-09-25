import { AIService } from './types'
import { getAIConfig, validateAIConfig } from './config'
import { MockAIService } from './mockService'
import { OpenRouterService } from './openrouterService'
import { GeminiService } from './geminiService'

let aiServiceInstance: AIService | null = null

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    const config = getAIConfig()
    console.log(`[AI Service] Initializing AI service with provider: ${config.provider}`)

    validateAIConfig(config)

    switch (config.provider) {
      case 'openrouter':
        console.log(`[AI Service] Using OpenRouter with model: ${config.openrouterModelName}`)
        aiServiceInstance = new OpenRouterService(config)
        break
      case 'gemini':
        console.log(`[AI Service] Using Gemini with model: ${config.geminiModelName}`)
        aiServiceInstance = new GeminiService(config)
        break
      case 'mock':
      default:
        console.log('[AI Service] Using Mock AI service for development')
        aiServiceInstance = new MockAIService()
        break
    }

    console.log('[AI Service] AI service initialized successfully')
  }

  return aiServiceInstance
}

// Helper function to reset the service instance (useful for testing or config changes)
export function resetAIService(): void {
  aiServiceInstance = null
}

// Re-export types for convenience
export type { GeneratedTask, AIService, AIProvider, AIConfig } from './types'