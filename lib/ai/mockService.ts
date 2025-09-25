import { AIService, GeneratedTask } from './types'

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

  async assignTasks(tasks: any[], resources: any[]): Promise<{ taskId: string; resourceId: string; reason: string }[]> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (!resources.length) {
      return []
    }

    // Mock assignment logic
    const assignments = tasks.map((task, index) => {
      const resource = resources[index % resources.length]
      const reasons = [
        `Best match for ${resource.role} role`,
        `Available capacity and relevant skills`,
        `Experience with similar tasks`,
        `Optimal workload distribution`
      ]

      return {
        taskId: task.id,
        resourceId: resource.id,
        reason: reasons[Math.floor(Math.random() * reasons.length)]
      }
    })

    return assignments
  }
}