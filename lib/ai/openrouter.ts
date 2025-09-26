import { getAIConfig } from './config'

interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatCompletionRequest {
  model: string
  messages: ChatCompletionMessage[]
  temperature?: number
  max_tokens?: number
}

interface ChatCompletionChoice {
  message: {
    role: string
    content: string
  }
  finish_reason: string
}

interface ChatCompletionResponse {
  choices: ChatCompletionChoice[]
}

class OpenRouterClient {
  private apiKey: string
  private defaultModel: string

  constructor() {
    const config = getAIConfig()
    // Only require API key if we're actually using OpenRouter
    if (config.provider === 'openrouter' && !config.openrouterApiKey) {
      throw new Error('OpenRouter API key is required when using OpenRouter provider')
    }
    this.apiKey = config.openrouterApiKey || ''
    this.defaultModel = config.openrouterModelName || 'meta-llama/llama-3.1-8b-instruct:free'
  }

  async create(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Task Scheduler'
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    return await response.json()
  }
}

// Create the openrouter client instance
const client = new OpenRouterClient()

// Export the client in the expected format
export const openrouter = {
  chat: {
    completions: {
      create: (request: ChatCompletionRequest) => client.create(request)
    }
  }
}