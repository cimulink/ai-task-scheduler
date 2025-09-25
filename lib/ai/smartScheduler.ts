import { TaskAssignment, ResourceWeeklySchedule, AssignmentPreview } from './types'

interface TaskForScheduling {
  id: string
  title: string
  estimatedHours: number
  priority: number
  requiredRole?: string
}

interface ResourceForScheduling {
  id: string
  name: string
  role: string
  weeklyHours: number
  skills: string[]
  currentlyAssignedHours?: number
}

export class SmartScheduler {
  private readonly MAX_WEEKS = 8 // Plan up to 8 weeks ahead
  private readonly PRIORITY_THRESHOLD_HIGH = 80
  private readonly PRIORITY_THRESHOLD_MEDIUM = 50

  assignTasksWithBandwidth(
    tasks: TaskForScheduling[],
    resources: ResourceForScheduling[]
  ): AssignmentPreview {
    console.log('[Smart Scheduler] Starting bandwidth-aware assignment')
    console.log(`[Smart Scheduler] Tasks: ${tasks.length}, Resources: ${resources.length}`)

    // Initialize resource schedules
    const schedules: ResourceWeeklySchedule[] = resources.map(resource => ({
      resourceId: resource.id,
      resourceName: resource.name,
      role: resource.role,
      weeklyCapacity: resource.weeklyHours,
      weeks: Array.from({ length: this.MAX_WEEKS }, (_, i) => ({
        weekNumber: i + 1,
        assignedHours: i === 0 ? (resource.currentlyAssignedHours || 0) : 0, // Current week starts with existing assignments
        availableHours: resource.weeklyHours - (i === 0 ? (resource.currentlyAssignedHours || 0) : 0),
        tasks: []
      }))
    }))

    // Sort tasks by priority (highest first)
    const sortedTasks = tasks.sort((a, b) => b.priority - a.priority)

    const assignments: TaskAssignment[] = []
    let immediateAssignments = 0
    let deferredAssignments = 0
    let overflowTasks = 0

    for (const task of sortedTasks) {
      const assignment = this.findBestAssignment(task, schedules)

      if (assignment) {
        assignments.push(assignment)

        // Update the resource schedule
        const schedule = schedules.find(s => s.resourceId === assignment.resourceId)!
        const week = schedule.weeks[assignment.scheduledWeek - 1]

        week.assignedHours += task.estimatedHours
        week.availableHours -= task.estimatedHours
        week.tasks.push({
          taskId: task.id,
          title: task.title,
          hours: task.estimatedHours,
          priority: task.priority
        })

        // Count assignment types
        if (assignment.scheduledWeek === 1) {
          immediateAssignments++
        } else {
          deferredAssignments++
        }

        if (assignment.isOverflow) {
          overflowTasks++
        }

        console.log(`[Smart Scheduler] Assigned "${task.title}" to ${schedule.resourceName} (Week ${assignment.scheduledWeek})`)
      } else {
        console.warn(`[Smart Scheduler] Could not assign task: ${task.title}`)
        overflowTasks++
      }
    }

    const preview: AssignmentPreview = {
      assignments,
      schedules,
      summary: {
        totalTasks: tasks.length,
        immediateAssignments,
        deferredAssignments,
        overflowTasks
      }
    }

    console.log('[Smart Scheduler] Assignment completed:', preview.summary)
    return preview
  }

  private findBestAssignment(
    task: TaskForScheduling,
    schedules: ResourceWeeklySchedule[]
  ): TaskAssignment | null {
    let bestAssignment: TaskAssignment | null = null
    let bestScore = -1

    for (const schedule of schedules) {
      // Check role compatibility
      if (task.requiredRole && !this.isRoleCompatible(task.requiredRole, schedule.role)) {
        continue
      }

      // Find the earliest week where this task can fit
      for (let weekIndex = 0; weekIndex < schedule.weeks.length; weekIndex++) {
        const week = schedule.weeks[weekIndex]

        if (week.availableHours >= task.estimatedHours) {
          const weekNumber = weekIndex + 1
          const isOverflow = weekNumber > 1
          const score = this.calculateAssignmentScore(task, schedule, weekNumber)

          if (score > bestScore) {
            bestScore = score
            bestAssignment = {
              taskId: task.id,
              resourceId: schedule.resourceId,
              scheduledWeek: weekNumber,
              reason: this.generateAssignmentReason(task, schedule, weekNumber, isOverflow),
              isOverflow
            }
          }
          break // Found earliest available week for this resource
        }
      }
    }

    return bestAssignment
  }

  private isRoleCompatible(requiredRole: string, resourceRole: string): boolean {
    // Simple role matching - can be enhanced with more sophisticated logic
    const roleCompatibility: Record<string, string[]> = {
      'developer': ['Developer', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer'],
      'designer': ['Designer', 'UI Designer', 'UX Designer', 'Graphic Designer'],
      'manager': ['Manager', 'Project Manager', 'Team Lead'],
      'copywriter': ['Copywriter', 'Content Writer', 'Marketing Specialist']
    }

    const requiredRoleLower = requiredRole.toLowerCase()
    const compatibleRoles = roleCompatibility[requiredRoleLower] || [requiredRole]

    return compatibleRoles.includes(resourceRole) || resourceRole === 'Other'
  }

  private calculateAssignmentScore(
    task: TaskForScheduling,
    schedule: ResourceWeeklySchedule,
    weekNumber: number
  ): number {
    let score = 0

    // Priority bonus - higher priority tasks get preference
    score += task.priority

    // Earlier week bonus
    score += (this.MAX_WEEKS - weekNumber) * 10

    // Resource utilization bonus - prefer resources with more availability
    const weekUtilization = schedule.weeks[weekNumber - 1].assignedHours / schedule.weeklyCapacity
    score += (1 - weekUtilization) * 20

    // High priority tasks should go to week 1 if possible
    if (task.priority >= this.PRIORITY_THRESHOLD_HIGH && weekNumber === 1) {
      score += 50
    }

    return score
  }

  private generateAssignmentReason(
    task: TaskForScheduling,
    schedule: ResourceWeeklySchedule,
    weekNumber: number,
    isOverflow: boolean
  ): string {
    if (weekNumber === 1) {
      if (task.priority >= this.PRIORITY_THRESHOLD_HIGH) {
        return `High priority task scheduled immediately`
      } else {
        return `Available capacity this week`
      }
    } else {
      if (isOverflow) {
        return `Week ${weekNumber} - Current week capacity exceeded`
      } else {
        return `Week ${weekNumber} - Optimal scheduling based on priority`
      }
    }
  }

  // Helper method to get scheduling summary text
  getSchedulingSummary(preview: AssignmentPreview): {
    title: string
    description: string
    suggestions: string[]
  } {
    const { summary, schedules } = preview

    let title = "Assignment Complete"
    let description = ""
    const suggestions: string[] = []

    if (summary.overflowTasks > 0) {
      title = "Bandwidth Exceeded"
      description = `${summary.immediateAssignments} tasks can start this week, ${summary.deferredAssignments} tasks scheduled for later weeks.`

      suggestions.push("Consider increasing team capacity")
      suggestions.push("Adjust task priorities to rebalance workload")
      suggestions.push("Split large tasks into smaller chunks")
    } else {
      description = `All ${summary.totalTasks} tasks successfully scheduled within current capacity.`
    }

    // Check for over-utilized resources
    const overUtilizedResources = schedules.filter(schedule =>
      schedule.weeks[0].assignedHours > schedule.weeklyCapacity * 0.9
    )

    if (overUtilizedResources.length > 0) {
      suggestions.push(`${overUtilizedResources.length} team member(s) near capacity limit`)
    }

    return { title, description, suggestions }
  }
}