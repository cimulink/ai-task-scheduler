export interface GeneratedTask {
  title: string
  description: string
  estimatedHours: number
  priority: number
}

export interface TaskAssignment {
  taskId: string
  resourceId: string
  scheduledWeek: number
  reason: string
  isOverflow: boolean
}

export interface ResourceWeeklySchedule {
  resourceId: string
  resourceName: string
  role: string
  weeklyCapacity: number
  weeks: {
    weekNumber: number
    assignedHours: number
    availableHours: number
    tasks: {
      taskId: string
      title: string
      hours: number
      priority: number
    }[]
  }[]
}

export interface AssignmentPreview {
  assignments: TaskAssignment[]
  schedules: ResourceWeeklySchedule[]
  summary: {
    totalTasks: number
    immediateAssignments: number
    deferredAssignments: number
    overflowTasks: number
  }
}

export interface AIService {
  generateTasks(projectDescription: string): Promise<GeneratedTask[]>
  estimateTask(taskDescription: string): Promise<{ estimatedHours: number; confidence: number }>
  assignTasks(tasks: any[], resources: any[]): Promise<AssignmentPreview>
}

export type AIProvider = 'openrouter' | 'gemini' | 'mock'

export interface AIConfig {
  provider: AIProvider
  openrouterApiKey?: string
  openrouterModelName?: string
  geminiApiKey?: string
  geminiModelName?: string
}