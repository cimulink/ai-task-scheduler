import { AIService, GeneratedTask, AIConfig, AssignmentPreview } from './types'
import { SmartScheduler } from './smartScheduler'

export class OpenRouterService implements AIService {
  private apiKey: string
  private modelName: string

  constructor(config: AIConfig) {
    if (!config.openrouterApiKey) {
      throw new Error('OpenRouter API key is required')
    }
    this.apiKey = config.openrouterApiKey
    this.modelName = config.openrouterModelName || 'meta-llama/llama-3.1-8b-instruct:free'
  }

  async generateTasks(projectDescription: string): Promise<GeneratedTask[]> {
    const prompt = `Break down this project into specific, actionable tasks:

Project Description: ${projectDescription}

Please return a JSON array of tasks with the following structure:
- title: Clear, actionable task name (string)
- description: 1-2 sentence explanation of what needs to be done (string)
- estimatedHours: Realistic time estimate in hours (number)
- priority: Priority score from 1-100 where 100 is highest priority (number)

Focus on deliverable outcomes, not processes. Include 5-10 tasks that cover the entire project lifecycle.

Return only the JSON array, no additional text.`

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Task Scheduler'
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content received from OpenRouter API')
      }

      // Try to extract JSON from the response
      let tasks: GeneratedTask[]
      try {
        // Remove any markdown code blocks if present
        const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim()
        tasks = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse OpenRouter response:', content)
        // Fallback to mock data if parsing fails
        return this.getFallbackTasks(projectDescription)
      }

      // Validate the structure
      if (!Array.isArray(tasks)) {
        throw new Error('Invalid response format: expected array')
      }

      // Validate and sanitize each task
      const validatedTasks = tasks
        .filter(task => task.title && task.description && typeof task.estimatedHours === 'number' && typeof task.priority === 'number')
        .map(task => ({
          title: String(task.title).substring(0, 255),
          description: String(task.description).substring(0, 1000),
          estimatedHours: Math.max(0.5, Math.min(100, Number(task.estimatedHours))),
          priority: Math.max(1, Math.min(100, Number(task.priority)))
        }))

      return validatedTasks.length > 0 ? validatedTasks : this.getFallbackTasks(projectDescription)

    } catch (error) {
      console.error('OpenRouter API error:', error)
      // Fallback to mock data
      return this.getFallbackTasks(projectDescription)
    }
  }

  async estimateTask(taskDescription: string): Promise<{ estimatedHours: number; confidence: number }> {
    const prompt = `Estimate the time required for this task in hours:

Task: ${taskDescription}

Consider the complexity, dependencies, and typical industry standards. Provide a realistic estimate.

Return only a JSON object with:
- estimatedHours: number (realistic time estimate)
- confidence: number (confidence level from 0.0 to 1.0)`

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Task Scheduler'
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      })

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content received from OpenRouter API')
      }

      const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim()
      const result = JSON.parse(cleanContent)

      return {
        estimatedHours: Math.max(0.5, Math.min(100, Number(result.estimatedHours))),
        confidence: Math.max(0.0, Math.min(1.0, Number(result.confidence)))
      }

    } catch (error) {
      console.error('OpenRouter estimation error:', error)
      // Fallback to basic estimation
      return {
        estimatedHours: 4,
        confidence: 0.5
      }
    }
  }

  async assignTasks(tasks: any[], resources: any[]): Promise<AssignmentPreview> {
    console.log('[OpenRouter Service] Starting smart assignment with bandwidth awareness')

    if (!resources.length) {
      return {
        assignments: [],
        schedules: [],
        summary: {
          totalTasks: tasks.length,
          immediateAssignments: 0,
          deferredAssignments: 0,
          overflowTasks: tasks.length
        }
      }
    }

    // Use SmartScheduler for bandwidth-aware assignment
    const scheduler = new SmartScheduler()

    // Transform tasks for scheduler
    const tasksForScheduling = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      estimatedHours: task.estimatedHours || 4,
      priority: task.priority || 50,
      requiredRole: this.inferRequiredRole(task.title, task.description)
    }))

    // Transform resources for scheduler
    const resourcesForScheduling = resources.map((resource: any) => ({
      id: resource.id,
      name: resource.name,
      role: resource.role,
      weeklyHours: resource.weeklyHours,
      skills: resource.skills || [],
      currentlyAssignedHours: resource.currentlyAssignedHours || 0
    }))

    console.log(`[OpenRouter Service] Processing ${tasksForScheduling.length} tasks with ${resourcesForScheduling.length} resources using smart scheduler`)

    const preview = scheduler.assignTasksWithBandwidth(tasksForScheduling, resourcesForScheduling)

    console.log('[OpenRouter Service] Smart assignment completed')
    return preview
  }

  private inferRequiredRole(title: string, description: string = ''): string {
    const content = (title + ' ' + description).toLowerCase()

    if (content.includes('design') || content.includes('ui') || content.includes('ux') || content.includes('mockup')) {
      return 'designer'
    }
    if (content.includes('code') || content.includes('develop') || content.includes('api') || content.includes('database')) {
      return 'developer'
    }
    if (content.includes('manage') || content.includes('plan') || content.includes('coordinate')) {
      return 'manager'
    }
    if (content.includes('content') || content.includes('copy') || content.includes('write')) {
      return 'copywriter'
    }

    return 'any'
  }

  private getFallbackTasks(projectDescription: string): GeneratedTask[] {
    // Fallback mock tasks when API fails
    return [
      {
        title: "Project Planning & Requirements",
        description: "Define project scope and gather requirements based on the project description",
        estimatedHours: 8,
        priority: 90
      },
      {
        title: "Design & Architecture",
        description: "Create system design and architecture for the project",
        estimatedHours: 12,
        priority: 85
      },
      {
        title: "Development Setup",
        description: "Set up development environment and project structure",
        estimatedHours: 4,
        priority: 80
      },
      {
        title: "Core Implementation",
        description: "Implement the main functionality of the project",
        estimatedHours: 20,
        priority: 75
      },
      {
        title: "Testing & QA",
        description: "Comprehensive testing and quality assurance",
        estimatedHours: 8,
        priority: 70
      }
    ]
  }
}