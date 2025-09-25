import { AIService, GeneratedTask, AssignmentPreview } from './types'
import { SmartScheduler } from './smartScheduler'

export class MockAIService implements AIService {
  async generateTasks(projectDescription: string): Promise<GeneratedTask[]> {
    console.log('[Mock Service] Starting mock task generation')
    console.log(`[Mock Service] Project description length: ${projectDescription.length} characters`)

    // Simulate AI processing delay
    console.log('[Mock Service] Simulating AI processing delay (2s)...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock task generation based on project description
    const mockTasks: GeneratedTask[] = [
      {
        title: "Project Planning & Requirements Gathering",
        description: "Define project scope, gather detailed requirements, and create project timeline",
        estimatedHours: 8,
        priority: 90
      },
      {
        title: "UI/UX Design & Wireframing",
        description: "Create wireframes, mockups, and design system for the project",
        estimatedHours: 16,
        priority: 85
      },
      {
        title: "Frontend Development Setup",
        description: "Set up development environment, project structure, and basic components",
        estimatedHours: 6,
        priority: 80
      },
      {
        title: "Backend API Development",
        description: "Develop core APIs and database integration",
        estimatedHours: 20,
        priority: 75
      },
      {
        title: "Frontend Implementation",
        description: "Implement user interface components and connect to backend APIs",
        estimatedHours: 24,
        priority: 70
      },
      {
        title: "Testing & Quality Assurance",
        description: "Perform comprehensive testing including unit tests, integration tests, and user acceptance testing",
        estimatedHours: 12,
        priority: 65
      },
      {
        title: "Deployment & Launch",
        description: "Deploy application to production environment and perform final checks",
        estimatedHours: 4,
        priority: 60
      }
    ]

    // Add context-specific tasks based on project description keywords
    const lowerDescription = projectDescription.toLowerCase()
    console.log('[Mock Service] Analyzing project description for keywords...')

    if (lowerDescription.includes('mobile') || lowerDescription.includes('responsive')) {
      console.log('[Mock Service] Found mobile/responsive keywords, adding mobile task')
      mockTasks.push({
        title: "Mobile Responsiveness Testing",
        description: "Ensure application works properly on mobile devices and tablets",
        estimatedHours: 6,
        priority: 55
      })
    }

    if (lowerDescription.includes('ai') || lowerDescription.includes('artificial intelligence') || lowerDescription.includes('machine learning')) {
      console.log('[Mock Service] Found AI keywords, adding AI integration task')
      mockTasks.push({
        title: "AI Integration & Training",
        description: "Integrate AI models and train them with relevant data",
        estimatedHours: 16,
        priority: 85
      })
    }

    if (lowerDescription.includes('database') || lowerDescription.includes('data')) {
      console.log('[Mock Service] Found database keywords, adding database task')
      mockTasks.push({
        title: "Database Design & Optimization",
        description: "Design database schema and optimize for performance",
        estimatedHours: 10,
        priority: 75
      })
    }

    if (lowerDescription.includes('api') || lowerDescription.includes('integration')) {
      console.log('[Mock Service] Found API keywords, adding API integration task')
      mockTasks.push({
        title: "Third-party API Integration",
        description: "Integrate with external APIs and services",
        estimatedHours: 8,
        priority: 70
      })
    }

    if (lowerDescription.includes('security') || lowerDescription.includes('auth')) {
      console.log('[Mock Service] Found security keywords, adding security task')
      mockTasks.push({
        title: "Security Implementation",
        description: "Implement authentication, authorization, and security measures",
        estimatedHours: 12,
        priority: 85
      })
    }

    console.log(`[Mock Service] Generated ${mockTasks.length} tasks total`)
    console.log('[Mock Service] Mock task generation completed successfully')

    return mockTasks
  }

  async estimateTask(taskDescription: string): Promise<{ estimatedHours: number; confidence: number }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock estimation based on task complexity indicators
    const lowerDescription = taskDescription.toLowerCase()
    let estimatedHours = 4 // Base estimate

    // Adjust based on complexity indicators
    if (lowerDescription.includes('complex') || lowerDescription.includes('advanced')) {
      estimatedHours *= 2
    }
    if (lowerDescription.includes('simple') || lowerDescription.includes('basic')) {
      estimatedHours *= 0.5
    }
    if (lowerDescription.includes('integration') || lowerDescription.includes('api')) {
      estimatedHours += 4
    }
    if (lowerDescription.includes('testing') || lowerDescription.includes('qa')) {
      estimatedHours += 2
    }

    return {
      estimatedHours: Math.round(estimatedHours),
      confidence: Math.random() * 0.3 + 0.7 // Random confidence between 0.7-1.0
    }
  }

  async assignTasks(tasks: any[], resources: any[]): Promise<AssignmentPreview> {
    console.log('[Mock Service] Starting bandwidth-aware task assignment')
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

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
      currentlyAssignedHours: 0 // This would come from existing task assignments in real scenario
    }))

    console.log(`[Mock Service] Processing ${tasksForScheduling.length} tasks with ${resourcesForScheduling.length} resources`)

    const preview = scheduler.assignTasksWithBandwidth(tasksForScheduling, resourcesForScheduling)

    console.log('[Mock Service] Smart assignment completed')
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

    return 'any' // Can be assigned to any role
  }
}