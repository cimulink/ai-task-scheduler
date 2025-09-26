interface TaskWithSchedule {
  id: string
  title: string
  estimatedHours: number | null
  priority: number
  status: string
  assignedTo: string | null
  assignee?: {
    id: string
    name: string
    weeklyHours: number
  } | null
  parentTaskId?: string | null
  subtasks?: TaskWithSchedule[]
}

interface ResourceSchedule {
  resourceId: string
  resourceName: string
  weeklyCapacity: number
  weeks: WeeklySchedule[]
}

interface WeeklySchedule {
  weekNumber: number
  assignedHours: number
  availableHours: number
  tasks: TaskScheduleItem[]
}

interface TaskScheduleItem {
  taskId: string
  title: string
  hours: number
  priority: number
  startWeek: number
  endWeek: number
  estimatedStartDate: Date
  estimatedEndDate: Date
}

interface TaskTimeline {
  taskId: string
  estimatedStartDate: Date | null
  estimatedEndDate: Date | null
  scheduledWeek: number | null
  isScheduled: boolean
  blockedBy: string[] // Task IDs that must complete first
  dependentTasks: string[] // Task IDs that depend on this task
}

export class TaskScheduler {
  private readonly WEEKS_TO_CALCULATE = 12
  private readonly HOURS_PER_WEEK = 40 // Standard work week

  calculateProjectSchedule(tasks: TaskWithSchedule[], currentDate: Date = new Date()): {
    taskTimelines: Map<string, TaskTimeline>
    resourceSchedules: Map<string, ResourceSchedule>
  } {
    const taskTimelines = new Map<string, TaskTimeline>()
    const resourceSchedules = new Map<string, ResourceSchedule>()

    // Get all unique resources
    const resources = this.extractResources(tasks)

    // Initialize resource schedules
    resources.forEach(resource => {
      resourceSchedules.set(resource.id, {
        resourceId: resource.id,
        resourceName: resource.name,
        weeklyCapacity: resource.weeklyHours,
        weeks: this.initializeWeeklySchedule(currentDate)
      })
    })

    // Sort tasks by priority (highest first) for scheduling
    const sortedTasks = this.flattenTasks(tasks)
      .filter(task => task.assignedTo && task.estimatedHours && task.status !== 'completed')
      .sort((a, b) => b.priority - a.priority)

    // Schedule each task
    sortedTasks.forEach(task => {
      const timeline = this.scheduleTask(task, resourceSchedules, currentDate)
      taskTimelines.set(task.id, timeline)
    })

    return { taskTimelines, resourceSchedules }
  }

  private scheduleTask(
    task: TaskWithSchedule,
    resourceSchedules: Map<string, ResourceSchedule>,
    currentDate: Date
  ): TaskTimeline {
    if (!task.assignedTo || !task.estimatedHours) {
      return {
        taskId: task.id,
        estimatedStartDate: null,
        estimatedEndDate: null,
        scheduledWeek: null,
        isScheduled: false,
        blockedBy: [],
        dependentTasks: []
      }
    }

    const resourceSchedule = resourceSchedules.get(task.assignedTo)
    if (!resourceSchedule) {
      return {
        taskId: task.id,
        estimatedStartDate: null,
        estimatedEndDate: null,
        scheduledWeek: null,
        isScheduled: false,
        blockedBy: [],
        dependentTasks: []
      }
    }

    // Find the first available slot for this task
    const requiredHours = task.estimatedHours
    let remainingHours = requiredHours
    let startWeek: number | null = null
    let endWeek: number | null = null
    let startDate: Date | null = null
    let endDate: Date | null = null

    for (let weekIndex = 0; weekIndex < resourceSchedule.weeks.length && remainingHours > 0; weekIndex++) {
      const week = resourceSchedule.weeks[weekIndex]
      const availableHours = Math.max(0, resourceSchedule.weeklyCapacity - week.assignedHours)

      if (availableHours > 0) {
        if (startWeek === null) {
          startWeek = week.weekNumber
          startDate = this.getWeekStartDate(currentDate, week.weekNumber)
        }

        const hoursToSchedule = Math.min(remainingHours, availableHours)

        // Add task to this week
        week.tasks.push({
          taskId: task.id,
          title: task.title,
          hours: hoursToSchedule,
          priority: task.priority,
          startWeek: week.weekNumber,
          endWeek: week.weekNumber,
          estimatedStartDate: this.getWeekStartDate(currentDate, week.weekNumber),
          estimatedEndDate: this.getWeekEndDate(currentDate, week.weekNumber)
        })

        week.assignedHours += hoursToSchedule
        remainingHours -= hoursToSchedule
        endWeek = week.weekNumber
        endDate = this.getWeekEndDate(currentDate, week.weekNumber)
      }
    }

    return {
      taskId: task.id,
      estimatedStartDate: startDate,
      estimatedEndDate: endDate,
      scheduledWeek: startWeek,
      isScheduled: remainingHours === 0,
      blockedBy: [],
      dependentTasks: []
    }
  }

  private extractResources(tasks: TaskWithSchedule[]): Array<{ id: string, name: string, weeklyHours: number }> {
    const resourceMap = new Map<string, { id: string, name: string, weeklyHours: number }>()

    const extractFromTasks = (taskList: TaskWithSchedule[]) => {
      taskList.forEach(task => {
        if (task.assignee && task.assignedTo) {
          resourceMap.set(task.assignedTo, {
            id: task.assignedTo,
            name: task.assignee.name,
            weeklyHours: task.assignee.weeklyHours
          })
        }
        if (task.subtasks) {
          extractFromTasks(task.subtasks)
        }
      })
    }

    extractFromTasks(tasks)
    return Array.from(resourceMap.values())
  }

  private flattenTasks(tasks: TaskWithSchedule[]): TaskWithSchedule[] {
    const flattened: TaskWithSchedule[] = []

    const flatten = (taskList: TaskWithSchedule[]) => {
      taskList.forEach(task => {
        flattened.push(task)
        if (task.subtasks) {
          flatten(task.subtasks)
        }
      })
    }

    flatten(tasks)
    return flattened
  }

  private initializeWeeklySchedule(currentDate: Date): WeeklySchedule[] {
    const weeks: WeeklySchedule[] = []

    for (let i = 0; i < this.WEEKS_TO_CALCULATE; i++) {
      weeks.push({
        weekNumber: i + 1,
        assignedHours: 0,
        availableHours: this.HOURS_PER_WEEK,
        tasks: []
      })
    }

    return weeks
  }

  private getWeekStartDate(currentDate: Date, weekNumber: number): Date {
    const startOfWeek = new Date(currentDate)
    // Get to start of current week (Monday)
    const dayOfWeek = startOfWeek.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset)

    // Add weeks
    startOfWeek.setDate(startOfWeek.getDate() + (weekNumber - 1) * 7)
    return startOfWeek
  }

  private getWeekEndDate(currentDate: Date, weekNumber: number): Date {
    const endOfWeek = this.getWeekStartDate(currentDate, weekNumber)
    endOfWeek.setDate(endOfWeek.getDate() + 6) // Sunday
    return endOfWeek
  }

  formatDate(date: Date | null): string {
    if (!date) return 'Not scheduled'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  formatDateRange(startDate: Date | null, endDate: Date | null): string {
    if (!startDate || !endDate) return 'Not scheduled'
    if (startDate.toDateString() === endDate.toDateString()) {
      return this.formatDate(startDate)
    }
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
  }
}