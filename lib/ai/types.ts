export interface GeneratedTask {
  title: string
  description: string
  estimatedHours: number
  priority: number
}

export interface AIService {
  generateTasks(projectDescription: string): Promise<GeneratedTask[]>
  estimateTask(taskDescription: string): Promise<{ estimatedHours: number; confidence: number }>
  assignTasks(tasks: any[], resources: any[]): Promise<{ taskId: string; resourceId: string; reason: string }[]>
}

export type AIProvider = 'openrouter' | 'gemini' | 'mock'

export interface AIConfig {
  provider: AIProvider
  openrouterApiKey?: string
  openrouterModelName?: string
  geminiApiKey?: string
  geminiModelName?: string
}