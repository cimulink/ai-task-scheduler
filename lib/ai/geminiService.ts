import { AIService, GeneratedTask, AIConfig } from './types'

export class GeminiService implements AIService {
  private apiKey: string
  private modelName: string

  constructor(config: AIConfig) {
    if (!config.geminiApiKey) {
      throw new Error('Gemini API key is required')
    }
    this.apiKey = config.geminiApiKey
    this.modelName = config.geminiModelName || 'gemini-1.5-flash'
  }

  async generateTasks(projectDescription: string): Promise<GeneratedTask[]> {
    console.log('[Gemini Service] Starting task generation')
    console.log(`[Gemini Service] Project description length: ${projectDescription.length} characters`)
    console.log(`[Gemini Service] Using model: ${this.modelName}`)

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
      console.log('[Gemini Service] Sending request to Gemini API...')
      const startTime = Date.now()

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          }
        })
      })

      const duration = Date.now() - startTime
      console.log(`[Gemini Service] API response received in ${duration}ms, status: ${response.status}`)

      if (!response.ok) {
        const error = await response.json()
        console.error(`[Gemini Service] API error: ${error.error?.message || response.statusText}`)
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      console.log(`[Gemini Service] Raw response length: ${content?.length || 0} characters`)
      if (content && content.length > 500) {
        console.log(`[Gemini Service] Response preview: ${content.substring(0, 500)}...`)
      } else {
        console.log(`[Gemini Service] Full response: ${content}`)
      }

      if (!content) {
        throw new Error('No content received from Gemini API')
      }

      // Try to extract JSON from the response
      let tasks: GeneratedTask[]
      try {
        console.log('[Gemini Service] Attempting to parse JSON response...')
        // Remove any markdown code blocks if present
        const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim()
        tasks = JSON.parse(cleanContent)
        console.log(`[Gemini Service] Successfully parsed ${tasks.length} tasks from response`)
      } catch (parseError) {
        console.error('[Gemini Service] Failed to parse JSON response:', parseError)
        console.error('[Gemini Service] Raw content:', content)
        console.log('[Gemini Service] Falling back to mock data due to parse error')
        return this.getFallbackTasks(projectDescription)
      }

      // Validate the structure
      if (!Array.isArray(tasks)) {
        console.error('[Gemini Service] Response is not an array, falling back to mock data')
        throw new Error('Invalid response format: expected array')
      }

      console.log(`[Gemini Service] Validating ${tasks.length} tasks...`)

      // Validate and sanitize each task
      const validatedTasks = tasks
        .filter(task => {
          const isValid = task.title && task.description && typeof task.estimatedHours === 'number' && typeof task.priority === 'number'
          if (!isValid) {
            console.warn('[Gemini Service] Filtering out invalid task:', task)
          }
          return isValid
        })
        .map(task => ({
          title: String(task.title).substring(0, 255),
          description: String(task.description).substring(0, 1000),
          estimatedHours: Math.max(0.5, Math.min(100, Number(task.estimatedHours))),
          priority: Math.max(1, Math.min(100, Number(task.priority)))
        }))

      console.log(`[Gemini Service] Successfully validated ${validatedTasks.length} tasks`)

      if (validatedTasks.length === 0) {
        console.warn('[Gemini Service] No valid tasks after validation, falling back to mock data')
        return this.getFallbackTasks(projectDescription)
      }

      console.log('[Gemini Service] Task generation completed successfully')
      return validatedTasks

    } catch (error) {
      console.error('[Gemini Service] Unexpected error during task generation:', error)
      console.log('[Gemini Service] Falling back to mock data due to error')
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!content) {
        throw new Error('No content received from Gemini API')
      }

      const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim()
      const result = JSON.parse(cleanContent)

      return {
        estimatedHours: Math.max(0.5, Math.min(100, Number(result.estimatedHours))),
        confidence: Math.max(0.0, Math.min(1.0, Number(result.confidence)))
      }

    } catch (error) {
      console.error('Gemini estimation error:', error)
      // Fallback to basic estimation
      return {
        estimatedHours: 4,
        confidence: 0.5
      }
    }
  }

  async assignTasks(tasks: any[], resources: any[]): Promise<{ taskId: string; resourceId: string; reason: string }[]> {
    if (!resources.length) {
      return []
    }

    const prompt = `Assign these tasks to the available resources based on their roles, skills, and workload:

Tasks:
${tasks.map(t => `- ${t.id}: ${t.title} (${t.estimatedHours}h, Priority: ${t.priority})`).join('\n')}

Resources:
${resources.map(r => `- ${r.id}: ${r.name} (${r.role}, ${r.weeklyHours}h/week, Skills: ${r.skills.join(', ')})`).join('\n')}

Return a JSON array with assignments:
- taskId: string (task ID)
- resourceId: string (resource ID)
- reason: string (brief explanation for the assignment)

Consider role matching, skill alignment, and workload distribution.`

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1000,
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!content) {
        throw new Error('No content received from Gemini API')
      }

      const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim()
      const assignments = JSON.parse(cleanContent)

      return Array.isArray(assignments) ? assignments : []

    } catch (error) {
      console.error('Gemini assignment error:', error)
      // Fallback to simple round-robin assignment
      return tasks.map((task, index) => ({
        taskId: task.id,
        resourceId: resources[index % resources.length].id,
        reason: 'Automatic assignment based on availability'
      }))
    }
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