import { openrouter } from '@/lib/ai/openrouter'
import { getAIConfig } from '@/lib/ai/config'
import { getAIService } from '@/lib/ai/aiService'

export interface Task {
  id: string
  title: string
  description: string | null
  estimatedHours: number | null
  priority: number
  status: string
}

export interface UpdateAnalysisInput {
  projectId: string
  updateDescription: string
  existingTasks: Task[]
}

export interface AffectedTask {
  taskId: string
  relevanceScore: number
  reason: string
  currentStatus: string
}

export interface SuggestedNewTask {
  title: string
  description: string
  estimatedHours: number
  priority: number
}

export interface UpdateAnalysisResult {
  affectedTasks: AffectedTask[]
  suggestedNewTasks: SuggestedNewTask[]
}

export interface TaskModification {
  taskId: string
  title?: string
  description?: string
  estimatedHours?: number
  priority?: number
  reasoning: string
}

export class UpdateAnalyzer {
  private readonly RELEVANCE_THRESHOLD = 30  // Lowered from 70 to catch more relevant tasks

  async analyzeUpdate(input: UpdateAnalysisInput): Promise<UpdateAnalysisResult> {
    const { updateDescription, existingTasks } = input
    const config = getAIConfig()

    // If using mock provider, return fallback immediately
    if (config.provider === 'mock') {
      return this.fallbackAnalysis(updateDescription, existingTasks)
    }

    // Format existing tasks for the prompt
    const taskList = existingTasks
      .map(task => `ID: ${task.id}\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nStatus: ${task.status}`)
      .join('\n\n')

    const prompt = `Project Update: ${updateDescription}

Existing Tasks:
${taskList}

Analyze which existing tasks might be affected by this update. Return JSON:
{
  "affectedTasks": [
    {
      "taskId": "task-123",
      "relevanceScore": 85,
      "reason": "This task handles user interface which needs mobile responsiveness"
    }
  ],
  "suggestedNewTasks": [
    {
      "title": "Mobile responsive design implementation",
      "description": "Make all UI components responsive for mobile devices",
      "estimatedHours": 16,
      "priority": 80
    }
  ]
}

Only flag tasks that are directly affected by the change. Be conservative. Relevance score should be 0-100 where 100 is most relevant.

Keep responses concise:
- Limit to maximum 10 affected tasks
- Limit to maximum 5 suggested new tasks
- Keep reason text under 50 words each
- Use simple, clear language

IMPORTANT: Return only the JSON object, no markdown formatting, no explanation text, no code blocks.`

    try {
      const content = await this.callAI(prompt, config)

      // Parse JSON response - handle markdown code blocks
      const result = this.parseJSONResponse(content)

      // Filter tasks by relevance threshold and add current status
      const filteredAffectedTasks = result.affectedTasks
        ?.filter((task: any) => task.relevanceScore >= this.RELEVANCE_THRESHOLD)
        .map((task: any) => ({
          ...task,
          currentStatus: existingTasks.find(t => t.id === task.taskId)?.status || 'unknown'
        })) || []

      return {
        affectedTasks: filteredAffectedTasks,
        suggestedNewTasks: result.suggestedNewTasks || []
      }
    } catch (error) {
      console.error('Error analyzing update:', error)

      // Fallback to simple keyword matching
      return this.fallbackAnalysis(updateDescription, existingTasks)
    }
  }

  async generateModifications(
    taskIds: string[],
    updateContext: string,
    existingTasks: Task[]
  ): Promise<TaskModification[]> {
    const config = getAIConfig()

    console.log(`[UpdateAnalyzer] Starting generateModifications for ${taskIds.length} tasks in single API call`)
    console.log(`[UpdateAnalyzer] Task IDs:`, taskIds)

    // If using mock provider, return simple mock modifications
    if (config.provider === 'mock') {
      console.log('[UpdateAnalyzer] Using mock provider for modifications')
      return taskIds.map(taskId => ({
        taskId,
        reasoning: 'Mock modification for testing purposes'
      }))
    }

    // Get all selected tasks
    const selectedTasks = taskIds
      .map(taskId => existingTasks.find(t => t.id === taskId))
      .filter(task => task !== undefined) as Task[]

    if (selectedTasks.length === 0) {
      console.log('[UpdateAnalyzer] No valid tasks found for modification')
      return []
    }

    // Create a single prompt for all tasks
    const tasksInfo = selectedTasks
      .map(task => `Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description || 'No description'}
Hours: ${task.estimatedHours || 'Not estimated'}
Priority: ${task.priority}`)
      .join('\n\n')

    const prompt = `Update Context: ${updateContext}

Tasks to analyze:
${tasksInfo}

For each task, suggest modifications needed for this update. Return JSON array:
[
  {
    "taskId": "task-id-1",
    "title": "updated title if needed (or original if no change)",
    "description": "updated description if needed (or original if no change)",
    "estimatedHours": updated_hours_if_needed,
    "priority": updated_priority_if_needed,
    "reasoning": "why these changes are needed or 'No changes needed'"
  },
  {
    "taskId": "task-id-2",
    ...
  }
]

Only modify what's necessary. Keep changes minimal and focused. Include all tasks in the response even if no changes are needed.

Keep responses concise:
- Keep reasoning text under 50 words each
- Use simple, clear language

IMPORTANT: Return only the JSON array, no markdown formatting, no explanation text, no code blocks.`

    try {
      console.log(`[UpdateAnalyzer] Making single API call for ${selectedTasks.length} tasks`)
      const startTime = Date.now()

      const content = await this.callAI(prompt, config)

      const callDuration = Date.now() - startTime
      console.log(`[UpdateAnalyzer] Single API call completed in ${callDuration}ms`)

      const result = this.parseJSONResponse(content, false) // false = skip analysis validation for modifications

      // Ensure result is an array
      const modifications: TaskModification[] = []
      const taskModifications = Array.isArray(result) ? result : []

      for (const taskMod of taskModifications) {
        if (!taskMod.taskId) continue

        const originalTask = selectedTasks.find(t => t.id === taskMod.taskId)
        if (!originalTask) continue

        // Only include fields that are actually different
        const modification: TaskModification = {
          taskId: taskMod.taskId,
          reasoning: taskMod.reasoning || 'AI suggested modification'
        }

        // Add modified fields only if they're different from current values
        if (taskMod.title && taskMod.title !== originalTask.title) {
          modification.title = taskMod.title
        }
        if (taskMod.description && taskMod.description !== (originalTask.description || 'No description')) {
          modification.description = taskMod.description
        }
        if (taskMod.estimatedHours && taskMod.estimatedHours !== originalTask.estimatedHours) {
          modification.estimatedHours = taskMod.estimatedHours
        }
        if (taskMod.priority && taskMod.priority !== originalTask.priority) {
          modification.priority = taskMod.priority
        }

        // Only add modification if there are actual changes
        if (Object.keys(modification).length > 2) { // More than just taskId and reasoning
          console.log(`[UpdateAnalyzer] Generated modification for task ${taskMod.taskId}:`, Object.keys(modification).filter(k => k !== 'taskId' && k !== 'reasoning'))
          modifications.push(modification)
        } else {
          console.log(`[UpdateAnalyzer] No modifications needed for task ${taskMod.taskId}`)
        }
      }

      console.log(`[UpdateAnalyzer] generateModifications completed. Generated ${modifications.length} modifications out of ${selectedTasks.length} tasks`)
      return modifications

    } catch (error) {
      console.error(`[UpdateAnalyzer] Error generating modifications:`, error)

      // Fallback to empty modifications on error
      console.log('[UpdateAnalyzer] Falling back to no modifications due to error')
      return []
    }
  }

  private fallbackAnalysis(updateDescription: string, existingTasks: Task[]): UpdateAnalysisResult {
    // Simple keyword-based matching as fallback
    const keywords = updateDescription.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)

    const affectedTasks = existingTasks
      .map(task => {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase()
        const matchCount = keywords.filter(keyword => taskText.includes(keyword)).length
        const relevanceScore = Math.min((matchCount / keywords.length) * 100, 100)

        return {
          taskId: task.id,
          relevanceScore: Math.round(relevanceScore),
          reason: `Keyword matches found: ${matchCount}/${keywords.length}`,
          currentStatus: task.status
        }
      })
      .filter(task => task.relevanceScore >= this.RELEVANCE_THRESHOLD)

    // Generate some basic new tasks based on the update description
    const suggestedNewTasks = this.generateFallbackNewTasks(updateDescription)

    const result = {
      affectedTasks: affectedTasks.map(task => ({
        taskId: task.taskId,
        relevanceScore: task.relevanceScore,
        reason: task.reason,
        currentStatus: task.currentStatus
      })),
      suggestedNewTasks
    }

    return result
  }

  private generateFallbackNewTasks(updateDescription: string): SuggestedNewTask[] {
    // Generate basic new tasks based on common update patterns
    const description = updateDescription.toLowerCase()
    const newTasks: SuggestedNewTask[] = []

    // Common patterns and their suggested tasks
    const patterns = [
      {
        keywords: ['mobile', 'responsive', 'phone', 'tablet'],
        task: {
          title: 'Mobile Responsive Design',
          description: 'Implement responsive design for mobile and tablet devices',
          estimatedHours: 16,
          priority: 80
        }
      },
      {
        keywords: ['dark', 'mode', 'theme'],
        task: {
          title: 'Dark Mode Implementation',
          description: 'Add dark mode theme support with user preference storage',
          estimatedHours: 12,
          priority: 70
        }
      },
      {
        keywords: ['auth', 'login', 'register', 'signup', 'authentication'],
        task: {
          title: 'User Authentication System',
          description: 'Implement user login, registration, and authentication flow',
          estimatedHours: 20,
          priority: 85
        }
      },
      {
        keywords: ['api', 'backend', 'server', 'database'],
        task: {
          title: 'Backend API Development',
          description: 'Develop backend API endpoints and database integration',
          estimatedHours: 24,
          priority: 90
        }
      },
      {
        keywords: ['test', 'testing', 'unit', 'integration'],
        task: {
          title: 'Testing Implementation',
          description: 'Add comprehensive testing suite with unit and integration tests',
          estimatedHours: 16,
          priority: 75
        }
      },
      {
        keywords: ['security', 'secure', 'encryption', 'ssl'],
        task: {
          title: 'Security Implementation',
          description: 'Implement security measures and data protection',
          estimatedHours: 18,
          priority: 85
        }
      },
      {
        keywords: ['performance', 'optimize', 'speed', 'cache'],
        task: {
          title: 'Performance Optimization',
          description: 'Optimize application performance and implement caching',
          estimatedHours: 14,
          priority: 75
        }
      }
    ]

    // Check for pattern matches
    for (const pattern of patterns) {
      const matches = pattern.keywords.some(keyword => description.includes(keyword))
      if (matches) {
        newTasks.push(pattern.task)
      }
    }

    // If no patterns match, create a generic task
    if (newTasks.length === 0) {
      newTasks.push({
        title: 'Implement Update Requirements',
        description: `Implement the changes described: ${updateDescription.slice(0, 100)}${updateDescription.length > 100 ? '...' : ''}`,
        estimatedHours: 8,
        priority: 70
      })
    }

    return newTasks.slice(0, 3) // Limit to 3 tasks
  }

  private async callAI(prompt: string, config: any): Promise<string> {
    console.log('[UpdateAnalyzer] Calling AI with provider:', config.provider)
    console.log('[UpdateAnalyzer] Prompt length:', prompt.length, 'characters')

    if (config.provider === 'openrouter') {
      const response = await openrouter.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenRouter service')
      }
      return content

    } else if (config.provider === 'gemini') {
      console.log('[UpdateAnalyzer] Making Gemini API request...')
      const requestStartTime = Date.now()

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModelName}:generateContent?key=${config.geminiApiKey}`, {
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
            temperature: 0.1,
            maxOutputTokens: 4000,  // Increased from 2000
          }
        })
      })

      const requestDuration = Date.now() - requestStartTime
      console.log(`[UpdateAnalyzer] Gemini API request completed in ${requestDuration}ms with status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[UpdateAnalyzer] Gemini API error response:', errorText)
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text

      if (!content) {
        console.error('[UpdateAnalyzer] Empty response from Gemini. Full result:', JSON.stringify(result, null, 2))
        throw new Error('No response from Gemini service')
      }

      console.log('[UpdateAnalyzer] Gemini response length:', content.length, 'characters')
      return content

    } else {
      throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
  }

  private parseJSONResponse(content: string, validateAnalysisStructure: boolean = true): any {
    // Remove markdown code blocks if present
    let cleanContent = content.trim()

    // Handle ```json ... ``` blocks
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    }
    // Handle ``` ... ``` blocks (without language specifier)
    else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Remove any leading/trailing whitespace
    cleanContent = cleanContent.trim()

    // Check for obviously incomplete JSON
    if (this.isIncompleteJSON(cleanContent)) {
      console.error('[UpdateAnalyzer] Detected incomplete JSON response')
      console.error('Content length:', cleanContent.length)
      console.error('Last 100 chars:', cleanContent.slice(-100))
      throw new Error('AI response appears to be truncated - incomplete JSON detected')
    }

    try {
      const result = JSON.parse(cleanContent)

      // Validate that we have the expected structure (only for analysis phase)
      if (validateAnalysisStructure && !result.affectedTasks && !result.suggestedNewTasks) {
        throw new Error('AI response missing required fields (affectedTasks, suggestedNewTasks)')
      }

      return result
    } catch (error) {
      console.error('[UpdateAnalyzer] JSON parsing failed.')
      console.error('Content length:', cleanContent.length)
      console.error('Raw response (first 300):', content.substring(0, 300) + '...')
      console.error('Raw response (last 300):', content.slice(-300))
      console.error('Clean content (first 300):', cleanContent.substring(0, 300) + '...')
      console.error('Clean content (last 300):', cleanContent.slice(-300))
      throw new Error(`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private isIncompleteJSON(content: string): boolean {
    // Check for common signs of incomplete JSON
    const lastChar = content.trim().slice(-1)

    // JSON should end with } or ]
    if (lastChar !== '}' && lastChar !== ']') {
      return true
    }

    // Count braces - should be balanced
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    const openBrackets = (content.match(/\[/g) || []).length
    const closeBrackets = (content.match(/\]/g) || []).length

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      return true
    }

    // Check for unterminated strings (basic check)
    const quotes = (content.match(/"/g) || []).length
    if (quotes % 2 !== 0) {
      return true
    }

    return false
  }
}

export const updateAnalyzer = new UpdateAnalyzer()